"""Blue Carbon estimation API routes (Phase 6)."""
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from ...schemas.carbon import (
    CarbonEstimate,
    CarbonPoolsResponse,
    CarbonChangeResponse,
    CarbonMethodologyResponse,
    CarbonUncertaintyResponse,
)
from ...services.carbon import (
    get_carbon_estimate_service,
    get_carbon_pools_service,
    get_carbon_change_service,
    get_carbon_uncertainty_service,
    get_carbon_methodology_service,
)

logger = logging.getLogger("sundarban.api.carbon")

router = APIRouter(tags=["Carbon Insights"])


@router.get(
    "/carbon",
    response_model=CarbonEstimate,
    summary="Get Model-Based Indicative Carbon Stock Estimate",
    description="Retrieve model-based indicative blue-carbon tonnages, CO2e equivalents, pool breakdowns, and uncertainty bounds.",
)
async def read_carbon(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> CarbonEstimate:
    """Retrieve model-based indicative blue-carbon tonnages and uncertainty factors."""
    target_village = village_id or villageId
    if not target_village:
        raise HTTPException(
            status_code=422,
            detail="Query parameter 'village_id' or 'villageId' is required.",
        )
    return await get_carbon_estimate_service(village_id=target_village, year=year or 2025)


@router.get(
    "/carbon/pools",
    response_model=CarbonPoolsResponse,
    summary="Get Carbon Pools Stratification",
    description="Retrieve stratified carbon pools: Aboveground Biomass (AGB), Belowground Biomass (BGB), and Soil Organic Carbon (SOC 0-1m).",
)
async def read_carbon_pools(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> CarbonPoolsResponse:
    """Retrieve stratified carbon pools breakdown."""
    target_village = village_id or villageId or "gosaba"
    return await get_carbon_pools_service(village_id=target_village, year=year or 2025)


@router.get(
    "/carbon/methodology",
    response_model=CarbonMethodologyResponse,
    summary="Get Carbon Accounting Methodology & Factor Provenance",
    description="Retrieve scientific methodology tier, IPCC reference citations, registered factor provenance, and auditing disclaimers.",
)
async def read_carbon_methodology() -> CarbonMethodologyResponse:
    """Retrieve structured methodology documentation and factor registry."""
    return await get_carbon_methodology_service()


@router.get(
    "/carbon/uncertainty",
    response_model=CarbonUncertaintyResponse,
    summary="Get Propagated Carbon Uncertainty & Bounds",
    description="Retrieve first-order Gaussian propagated uncertainty margins, confidence levels, and upper/lower bounds.",
)
async def read_carbon_uncertainty(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> CarbonUncertaintyResponse:
    """Retrieve propagated uncertainty and confidence bounds."""
    target_village = village_id or villageId or "gosaba"
    return await get_carbon_uncertainty_service(village_id=target_village, year=year or 2025)


@router.get(
    "/carbon/change",
    response_model=CarbonChangeResponse,
    summary="Get Multi-Temporal Carbon Stock Change (2020 vs 2025)",
    description="Retrieve carbon stock change, gross loss/gain attribution, annualized indicators, and CO2e delta.",
)
async def read_carbon_change(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    from_year: Optional[int] = Query(default=2020, ge=2015, le=2030, description="Baseline year"),
    fromYear: Optional[int] = Query(default=None, description="CamelCase alias for from_year"),
    to_year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Comparison year"),
    toYear: Optional[int] = Query(default=None, description="CamelCase alias for to_year"),
) -> CarbonChangeResponse:
    """Retrieve multi-temporal carbon stock change analysis."""
    target_village = village_id or villageId or "gosaba"
    effective_from = from_year if fromYear is None else fromYear
    effective_to = to_year if toYear is None else toYear
    return await get_carbon_change_service(
        village_id=target_village,
        from_year=effective_from,
        to_year=effective_to,
    )
