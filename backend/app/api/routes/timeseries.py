"""Timeseries route."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from ...schemas.change_detection import TimeSeriesData
from ...services.timeseries import get_time_series

router = APIRouter(tags=["Timeseries"])


@router.get("/timeseries", response_model=TimeSeriesData)
async def read_timeseries(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
) -> TimeSeriesData:
    """Retrieve multi-year historical trend data for trend charts."""
    target_village = village_id or villageId
    if not target_village:
        raise HTTPException(
            status_code=422,
            detail="Query parameter 'village_id' or 'villageId' is required.",
        )
    return await get_time_series(village_id=target_village)
