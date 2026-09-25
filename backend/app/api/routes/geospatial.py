"""Geospatial API endpoints for Google Earth Engine, Sentinel-2 observations, and indices."""
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from ...schemas.geospatial import (
    GeospatialStatusResponse,
    SentinelObservation,
    GeospatialIndicesResponse,
    GeospatialPreviewResponse,
)
from ...services.geospatial import (
    get_geospatial_status_service,
    get_sentinel_observation_service,
    get_geospatial_indices_service,
    get_geospatial_preview_service,
)
from ...geospatial.sentinel2 import SentinelProcessingError

logger = logging.getLogger("sundarban.api.geospatial")

router = APIRouter(prefix="/geospatial", tags=["Geospatial & Satellite Telemetry"])


@router.get(
    "/status",
    response_model=GeospatialStatusResponse,
    summary="Check Google Earth Engine Status",
    description="Returns current initialization status, GEE project ID, active collection, and seasonal window.",
)
async def get_geospatial_status() -> GeospatialStatusResponse:
    """Retrieve Google Earth Engine and Sentinel-2 pipeline operational status."""
    try:
        return await get_geospatial_status_service()
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve geospatial engine status.",
        )


@router.get(
    "/observations",
    response_model=SentinelObservation,
    summary="Get Sentinel-2 Satellite Observation",
    description="Retrieve structured Sentinel-2 multi-spectral observation metadata and zonal statistics for an AOI.",
)
async def get_sentinel_observations(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: int = Query(default=2025, ge=2015, le=2030, description="Observation year (e.g., 2020, 2025)"),
) -> SentinelObservation:
    """Retrieve Sentinel-2 multi-spectral observation and band statistics."""
    target_village = village_id or villageId or "gosaba"
    try:
        return await get_sentinel_observation_service(village_id=target_village, year=year)
    except SentinelProcessingError as spe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if spe.code == "NO_SENTINEL_IMAGES" else status.HTTP_400_BAD_REQUEST,
            detail=spe.message,
        )
    except Exception as e:
        logger.error(f"Error fetching observation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process geospatial observation.",
        )


@router.get(
    "/indices",
    response_model=GeospatialIndicesResponse,
    summary="Get NDVI and NDWI Spectral Indices",
    description="Retrieve NDVI canopy health and NDWI water boundary index statistics with formulas and scientific context.",
)
async def get_geospatial_indices(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: int = Query(default=2025, ge=2015, le=2030, description="Observation year (e.g., 2020, 2025)"),
) -> GeospatialIndicesResponse:
    """Retrieve detailed NDVI and NDWI index analytics."""
    target_village = village_id or villageId or "gosaba"
    try:
        return await get_geospatial_indices_service(village_id=target_village, year=year)
    except SentinelProcessingError as spe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if spe.code == "NO_SENTINEL_IMAGES" else status.HTTP_400_BAD_REQUEST,
            detail=spe.message,
        )
    except Exception as e:
        logger.error(f"Error fetching indices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute spectral indices.",
        )


@router.get(
    "/preview",
    response_model=GeospatialPreviewResponse,
    summary="Get Map-Ready GeoJSON Preview",
    description="Retrieve observation metadata packaged inside a valid GeoJSON FeatureCollection for Leaflet map overlay.",
)
async def get_geospatial_preview(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: int = Query(default=2025, ge=2015, le=2030, description="Observation year (e.g., 2020, 2025)"),
) -> GeospatialPreviewResponse:
    """Retrieve map-ready GeoJSON preview payload."""
    target_village = village_id or villageId or "gosaba"
    try:
        return await get_geospatial_preview_service(village_id=target_village, year=year)
    except SentinelProcessingError as spe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if spe.code == "NO_SENTINEL_IMAGES" else status.HTTP_400_BAD_REQUEST,
            detail=spe.message,
        )
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate geospatial preview.",
        )
