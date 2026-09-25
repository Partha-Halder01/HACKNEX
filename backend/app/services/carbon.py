"""Model-based indicative Blue Carbon service layer with MongoDB query and demo fallback (Phase 6)."""
import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from ..schemas.carbon import (
    CarbonEstimate,
    CarbonPoolsResponse,
    CarbonChangeResponse,
    CarbonMethodologyResponse,
    CarbonUncertaintyResponse,
    CarbonPoolDetail,
    ExcludedPoolDetail,
    CarbonUncertainty,
    CarbonMethodology,
    CarbonValuation,
    PrimaryReferenceDetail,
)
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES
from ..carbon import (
    calculate_carbon_stock,
    calculate_carbon_change,
    calculate_propagated_uncertainty,
    calculate_indicative_valuation,
    get_methodology_report,
    CO2_TO_C_RATIO,
)

logger = logging.getLogger("sundarban.services.carbon")

# Sector baseline activity data mapped from Phase 4 & Phase 5
_SECTOR_MANGROVE_AREAS = {
    "gosaba": {
        "name": "Gosaba",
        2020: 750.6,
        2025: 775.6,
        "lossHa": 9.6,
        "gainHa": 34.6,
        "classificationConfidence": 0.918,
    },
    "satjelia": {
        "name": "Satjelia",
        2020: 554.0,
        2025: 569.4,
        "lossHa": 6.4,
        "gainHa": 21.8,
        "classificationConfidence": 0.916,
    },
}


def _resolve_village(village_id: str) -> Dict[str, Any]:
    """Normalize village identifier to pilot sector baseline."""
    clean_id = village_id.lower().strip()
    clean_id = "satjelia" if "sat" in clean_id else "gosaba"
    return {
        "id": clean_id,
        "info": _SECTOR_MANGROVE_AREAS[clean_id],
    }


async def get_carbon_estimate_service(
    village_id: str,
    year: int = 2025,
) -> CarbonEstimate:
    """Retrieve comprehensive model-based indicative carbon estimation data."""
    v_res = _resolve_village(village_id)
    target_id = v_res["id"]
    sector_info = v_res["info"]
    village_name = sector_info["name"]

    mangrove_area_ha = sector_info.get(year, sector_info[2025])
    conf = sector_info.get("classificationConfidence", 0.90)

    # 1. Check MongoDB cache
    db = get_database()
    if db is not None:
        try:
            doc = await db.carbon_estimates.find_one(
                {"village_id": target_id, "year": year},
                {"_id": 0},
            )
            if doc:
                return CarbonEstimate(**doc)
        except Exception as e:
            logger.warning(f"[CarbonService] Error querying MongoDB: {e}")

    # 2. Compute stock and pool stratification
    stock_res = calculate_carbon_stock(mangrove_area_ha)
    unc_res = calculate_propagated_uncertainty(
        carbon_stock_mg_c=stock_res["totalCarbonMgC"],
        classification_confidence=conf,
    )
    val_res = calculate_indicative_valuation(
        co2e_metric_tons=stock_res["totalCo2eMg"],
    )

    pools_dict: Dict[str, CarbonPoolDetail] = {
        k: CarbonPoolDetail(**v) for k, v in stock_res["pools"].items()
    }
    excluded_list = [ExcludedPoolDetail(**e) for e in stock_res["excludedPools"]]

    uncertainty_obj = CarbonUncertainty(
        min_estimate=unc_res["lowerBoundMgC"],
        max_estimate=unc_res["upperBoundMgC"],
        confidence_level=unc_res["confidenceLevel"],
        margin_of_error=unc_res["combinedRelativeUncertaintyPct"],
        status=unc_res["status"],
        combined_relative_uncertainty_pct=unc_res["combinedRelativeUncertaintyPct"],
        margin_of_error_mg_c=unc_res["marginOfErrorMgC"],
        lower_bound_mg_c=unc_res["lowerBoundMgC"],
        upper_bound_mg_c=unc_res["upperBoundMgC"],
        carbon_range=unc_res["carbonRange"],
        area_uncertainty_pct=unc_res["areaUncertaintyPct"],
        factor_uncertainty_pct=unc_res["factorUncertaintyPct"],
        classification_confidence=unc_res["classificationConfidence"],
        methodology_note=unc_res["methodologyNote"],
    )

    methodology_obj = CarbonMethodology()
    valuation_obj = CarbonValuation(**val_res)

    result = CarbonEstimate(
        village_id=target_id,
        village_name=village_name,
        year=year,
        mangrove_area_ha=mangrove_area_ha,
        scientific_factor=14.8,  # Legacy summary multiplier for backward compatibility
        factor_unit="tCO2e/ha",
        total_carbon_tons=stock_res["totalCarbonMgC"],
        carbon_stock_mg_c=stock_res["totalCarbonMgC"],
        co2e_equivalent_mg=stock_res["totalCo2eMg"],
        carbon_range=unc_res["carbonRange"],
        uncertainty=uncertainty_obj,
        methodology=methodology_obj,
        indicative_note=(
            "Model-based indicative estimate combining Sentinel-2 classified canopy area with IPCC 2013 "
            "Wetlands Supplement stock density factors. Not certified carbon credit issuance."
        ),
        is_indicative=True,
        pools=pools_dict,
        included_pools=stock_res["includedPools"],
        excluded_pools=excluded_list,
        valuation=valuation_obj,
        data_source="demo_fallback",
        is_real_data=False,
        estimate_status="indicative",
    )

    # 3. Cache in MongoDB if available
    if db is not None:
        try:
            doc_dict = result.model_dump(by_alias=True)
            await db.carbon_estimates.update_one(
                {"village_id": target_id, "year": year},
                {"$set": doc_dict},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"[CarbonService] Error saving to MongoDB: {e}")

    return result


async def get_carbon_pools_service(
    village_id: str,
    year: int = 2025,
) -> CarbonPoolsResponse:
    """Retrieve dedicated carbon pools stratification response."""
    est = await get_carbon_estimate_service(village_id=village_id, year=year)
    return CarbonPoolsResponse(
        village_id=est.village_id,
        village_name=est.village_name or "Gosaba",
        year=est.year,
        mangrove_area_ha=est.mangrove_area_ha,
        total_carbon_mg_c=est.carbon_stock_mg_c or est.total_carbon_tons,
        total_co2e_mg=est.co2e_equivalent_mg or round(est.total_carbon_tons * CO2_TO_C_RATIO, 2),
        total_density_mg_c_per_ha=round((est.carbon_stock_mg_c or est.total_carbon_tons) / est.mangrove_area_ha, 2) if est.mangrove_area_ha > 0 else 0.0,
        pools=est.pools or {},
        included_pools=est.included_pools or ["Aboveground Biomass (AGB)", "Belowground Biomass (BGB)", "Soil Organic Carbon (SOC 0–1m)"],
        excluded_pools=est.excluded_pools or [],
        data_source="demo_fallback",
        is_real_data=False,
    )


async def get_carbon_change_service(
    village_id: str,
    from_year: int = 2020,
    to_year: int = 2025,
) -> CarbonChangeResponse:
    """Retrieve multi-temporal carbon stock change analysis (2020 vs 2025)."""
    if from_year >= to_year:
        raise HTTPException(
            status_code=400,
            detail=f"Baseline year ({from_year}) must be strictly less than comparison year ({to_year}).",
        )

    v_res = _resolve_village(village_id)
    target_id = v_res["id"]
    sector_info = v_res["info"]

    base_ha = sector_info[2020]
    comp_ha = sector_info[2025]
    loss_ha = sector_info["lossHa"]
    gain_ha = sector_info["gainHa"]

    ch_res = calculate_carbon_change(
        baseline_mangrove_ha=base_ha,
        comparison_mangrove_ha=comp_ha,
        gross_loss_ha=loss_ha,
        gross_gain_ha=gain_ha,
        from_year=from_year,
        to_year=to_year,
    )

    unc_res = calculate_propagated_uncertainty(
        carbon_stock_mg_c=ch_res["carbonStock2025MgC"],
        classification_confidence=sector_info.get("classificationConfidence", 0.90),
    )

    uncertainty_obj = CarbonUncertainty(
        min_estimate=unc_res["lowerBoundMgC"],
        max_estimate=unc_res["upperBoundMgC"],
        confidence_level=unc_res["confidenceLevel"],
        margin_of_error=unc_res["combinedRelativeUncertaintyPct"],
        status=unc_res["status"],
        combined_relative_uncertainty_pct=unc_res["combinedRelativeUncertaintyPct"],
        margin_of_error_mg_c=unc_res["marginOfErrorMgC"],
        lower_bound_mg_c=unc_res["lowerBoundMgC"],
        upper_bound_mg_c=unc_res["upperBoundMgC"],
        carbon_range=unc_res["carbonRange"],
    )

    return CarbonChangeResponse(
        village_id=target_id,
        village_name=sector_info["name"],
        from_year=from_year,
        to_year=to_year,
        number_of_years=ch_res["numberOfYears"],
        baseline_mangrove_ha=base_ha,
        comparison_mangrove_ha=comp_ha,
        carbon_stock_2020_mg_c=ch_res["carbonStock2020MgC"],
        co2e_stock_2020_mg=ch_res["co2eStock2020Mg"],
        carbon_stock_2025_mg_c=ch_res["carbonStock2025MgC"],
        co2e_stock_2025_mg=ch_res["co2eStock2025Mg"],
        carbon_stock_change_mg_c=ch_res["carbonStockChangeMgC"],
        co2e_change_mg_co2e=ch_res["co2eChangeMgCO2e"],
        percent_carbon_change=ch_res["percentCarbonChange"],
        gross_carbon_loss_mg_c=ch_res["grossCarbonLossMgC"],
        gross_co2e_loss_mg_co2e=ch_res["grossCo2eLossMgCO2e"],
        gross_carbon_gain_mg_c=ch_res["grossCarbonGainMgC"],
        gross_co2e_gain_mg_co2e=ch_res["grossCo2eGainMgCO2e"],
        annualized_stock_change_mg_c=ch_res["annualizedStockChangeMgC"],
        annualized_co2e_change_mg_co2e=ch_res["annualizedCo2eChangeMgCO2e"],
        total_density_mg_c_per_ha=ch_res["totalDensityMgCPerHa"],
        baseline_pools=ch_res["baselinePools"],
        comparison_pools=ch_res["comparisonPools"],
        uncertainty=uncertainty_obj,
        methodology=CarbonMethodology(),
        data_source="demo_fallback",
        is_real_data=False,
        accounting_notice=ch_res["accountingNotice"],
    )


async def get_carbon_uncertainty_service(
    village_id: str,
    year: int = 2025,
) -> CarbonUncertaintyResponse:
    """Retrieve dedicated uncertainty documentation and bounds for carbon stock."""
    est = await get_carbon_estimate_service(village_id=village_id, year=year)
    return CarbonUncertaintyResponse(
        village_id=est.village_id,
        year=est.year,
        mangrove_area_ha=est.mangrove_area_ha,
        carbon_stock_mg_c=est.carbon_stock_mg_c or est.total_carbon_tons,
        uncertainty=est.uncertainty,
        classification_confidence=est.uncertainty.classification_confidence,
        uncertainty_status=est.uncertainty.status,
    )


async def get_carbon_methodology_service() -> CarbonMethodologyResponse:
    """Retrieve structured methodology documentation and factor registry."""
    raw = get_methodology_report()
    refs = [PrimaryReferenceDetail(**r) for r in raw["primaryReferences"]]
    return CarbonMethodologyResponse(
        methodology_name=raw["methodologyName"],
        methodology_version=raw["methodologyVersion"],
        methodology_tier=raw["methodologyTier"],
        description=raw["description"],
        primary_references=refs,
        carbon_pools=raw["carbonPools"],
        registered_factors=raw["registeredFactors"],
        molecular_conversion_factor=raw["molecularConversionFactor"],
        assumptions=raw["assumptions"],
        limitations=raw["limitations"],
        carbon_credit_disclaimer=raw["carbonCreditDisclaimer"],
    )


# Backward-compatible wrapper
async def get_carbon_estimate(
    village_id: str,
    year: Optional[int] = 2025,
) -> CarbonEstimate:
    """Legacy backward-compatible signature."""
    return await get_carbon_estimate_service(
        village_id=village_id,
        year=year or 2025,
    )
