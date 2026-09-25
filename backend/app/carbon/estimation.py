"""Blue carbon estimation and multi-temporal change calculation engine (Phase 6).

Implements stock calculations, CO2-equivalent molecular conversions (44/12),
gross loss/gain attribution, and annualized stock-change indicators.
"""
import logging
from typing import Any, Dict, List, Optional
from .factors import CO2_TO_C_RATIO, CARBON_FACTORS, get_factor
from .pools import calculate_stratified_pools, PRIMARY_POOLS

logger = logging.getLogger("sundarban.carbon.estimation")


def calculate_carbon_stock(
    mangrove_area_ha: float,
    include_litter: bool = False,
) -> Dict[str, Any]:
    """Calculate baseline carbon stock and pool breakdown for a given mangrove area.

    Formula:
        CarbonStock (Mg C) = Area (ha) × CarbonDensity (Mg C / ha)
        CO2e (Mg CO2e) = CarbonStock (Mg C) × (44 / 12)

    Args:
        mangrove_area_ha: Classified mangrove surface area in hectares.
        include_litter: Whether to include dead wood/litter pool.

    Returns:
        Structured dictionary containing total carbon stock in Mg C and Mg CO2e,
        and per-pool stratification.
    """
    if mangrove_area_ha < 0:
        raise ValueError(f"Mangrove area cannot be negative, got {mangrove_area_ha}.")

    pool_results = calculate_stratified_pools(mangrove_area_ha, include_litter=include_litter)
    return pool_results


def calculate_carbon_change(
    baseline_mangrove_ha: float,
    comparison_mangrove_ha: float,
    gross_loss_ha: float,
    gross_gain_ha: float,
    from_year: int = 2020,
    to_year: int = 2025,
    include_litter: bool = False,
) -> Dict[str, Any]:
    """Calculate multi-temporal carbon stock changes and transition attribution.

    Distinguishes:
    1. Carbon Stock Change: Stock(2025) - Stock(2020)
    2. Gross Carbon Associated with Loss: LossArea × TotalCarbonDensity
    3. Gross Carbon Associated with Gain: GainArea × TotalCarbonDensity
    4. Annualized Stock-Change Indicator: TotalChange / NumberOfYears

    Args:
        baseline_mangrove_ha: Mangrove area in baseline year (e.g. 2020).
        comparison_mangrove_ha: Mangrove area in comparison year (e.g. 2025).
        gross_loss_ha: Mapped mangrove loss area between years.
        gross_gain_ha: Mapped mangrove gain area between years.
        from_year: Baseline year.
        to_year: Comparison year.
        include_litter: Whether to include litter pool.

    Returns:
        Structured carbon change report.
    """
    if from_year >= to_year:
        raise ValueError(f"from_year ({from_year}) must be strictly less than to_year ({to_year}).")

    stock_base = calculate_carbon_stock(baseline_mangrove_ha, include_litter=include_litter)
    stock_comp = calculate_carbon_stock(comparison_mangrove_ha, include_litter=include_litter)

    carbon_2020_mg_c = stock_base["totalCarbonMgC"]
    carbon_2025_mg_c = stock_comp["totalCarbonMgC"]
    density_mg_c_ha = stock_base["totalDensityMgCPerHa"]

    carbon_change_mg_c = round(carbon_2025_mg_c - carbon_2020_mg_c, 2)
    co2e_change_mg = round(carbon_change_mg_c * CO2_TO_C_RATIO, 2)

    # Transition attribution
    gross_carbon_loss_mg_c = round(gross_loss_ha * density_mg_c_ha, 2)
    gross_co2e_loss_mg = round(gross_carbon_loss_mg_c * CO2_TO_C_RATIO, 2)

    gross_carbon_gain_mg_c = round(gross_gain_ha * density_mg_c_ha, 2)
    gross_co2e_gain_mg = round(gross_carbon_gain_mg_c * CO2_TO_C_RATIO, 2)

    num_years = to_year - from_year
    annualized_change_mg_c = round(carbon_change_mg_c / num_years, 2) if num_years > 0 else 0.0
    annualized_co2e_mg = round(co2e_change_mg / num_years, 2) if num_years > 0 else 0.0

    percent_change = (
        round((carbon_change_mg_c / carbon_2020_mg_c) * 100.0, 2)
        if carbon_2020_mg_c > 0
        else None
    )

    return {
        "fromYear": from_year,
        "toYear": to_year,
        "numberOfYears": num_years,
        "baselineMangroveHa": baseline_mangrove_ha,
        "comparisonMangroveHa": comparison_mangrove_ha,
        "carbonStock2020MgC": carbon_2020_mg_c,
        "co2eStock2020Mg": stock_base["totalCo2eMg"],
        "carbonStock2025MgC": carbon_2025_mg_c,
        "co2eStock2025Mg": stock_comp["totalCo2eMg"],
        "carbonStockChangeMgC": carbon_change_mg_c,
        "co2eChangeMgCO2e": co2e_change_mg,
        "percentCarbonChange": percent_change,
        "grossCarbonLossMgC": gross_carbon_loss_mg_c,
        "grossCo2eLossMgCO2e": gross_co2e_loss_mg,
        "grossCarbonGainMgC": gross_carbon_gain_mg_c,
        "grossCo2eGainMgCO2e": gross_co2e_gain_mg,
        "annualizedStockChangeMgC": annualized_change_mg_c,
        "annualizedCo2eChangeMgCO2e": annualized_co2e_mg,
        "totalDensityMgCPerHa": density_mg_c_ha,
        "baselinePools": stock_base["pools"],
        "comparisonPools": stock_comp["pools"],
        "accountingNotice": (
            "Gross carbon associated with loss represents affected in-situ carbon stock, "
            "not immediate 100% atmospheric volatilization. Annualized stock-change is a "
            "temporal indicator between observation endpoints, not a continuous measured sequestration flux."
        ),
    }
