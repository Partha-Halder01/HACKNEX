"""Spatial monitoring route."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from ...schemas.monitoring import SpatialMonitoringData
from ...services.monitoring import get_spatial_monitoring

router = APIRouter(tags=["Spatial Monitoring"])


@router.get("/monitoring", response_model=SpatialMonitoringData)
async def read_spatial_monitoring(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, description="Observation year"),
) -> SpatialMonitoringData:
    """Retrieve spatial monitoring layers, land-cover summary, and GeoJSON polygons."""
    target_village = village_id or villageId
    if not target_village:
        raise HTTPException(
            status_code=422,
            detail="Query parameter 'village_id' or 'villageId' is required.",
        )
    return await get_spatial_monitoring(village_id=target_village, year=year)
