"""Overview metrics route."""
from typing import Optional
from fastapi import APIRouter, Query
from ...schemas.overview import OverviewMetrics
from ...services.overview import get_overview_metrics

router = APIRouter(tags=["Overview"])


@router.get("/overview", response_model=OverviewMetrics)
async def read_overview(
    village_id: Optional[str] = Query(default=None, description="Optional pilot village ID"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
) -> OverviewMetrics:
    """Retrieve aggregated platform KPI metrics for summary cards and banners."""
    target_village = village_id or villageId
    return await get_overview_metrics(village_id=target_village)
