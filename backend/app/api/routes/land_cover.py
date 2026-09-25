"""Land cover API endpoints for 5-class Random Forest classification, validation, and status."""
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from ...schemas.land_cover import (
    LandCoverDistribution,
    ModelStatusResponse,
    ModelValidationMetrics,
    LandCoverPreviewResponse,
)
from ...services.land_cover import (
    get_land_cover_service,
    get_land_cover_model_status_service,
    get_land_cover_validation_service,
    get_land_cover_preview_service,
)

logger = logging.getLogger("sundarban.api.land_cover")

router = APIRouter(tags=["Land Cover Classification"])


@router.get(
    "/land-cover",
    response_model=LandCoverDistribution,
    summary="Get 5-Class Land Cover Distribution",
    description="Retrieve 5-class land cover distribution percentages, hectare areas, and model metadata.",
)
async def read_land_cover(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> LandCoverDistribution:
    """Retrieve multi-class land cover distribution percentages and areas."""
    target_village = village_id or villageId
    if not target_village:
        raise HTTPException(
            status_code=422,
            detail="Query parameter 'village_id' or 'villageId' is required.",
        )
    return await get_land_cover_service(village_id=target_village, year=year or 2025)


@router.get(
    "/land-cover/model-status",
    response_model=ModelStatusResponse,
    summary="Get Random Forest Model Status",
    description="Reports whether the Random Forest classifier is loaded, version info, and training metadata.",
)
async def get_land_cover_model_status() -> ModelStatusResponse:
    """Retrieve operational status and metadata of the active Random Forest classifier."""
    try:
        return await get_land_cover_model_status_service()
    except Exception as e:
        logger.error(f"Error fetching model status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve land-cover model status.",
        )


@router.get(
    "/land-cover/validation",
    response_model=ModelValidationMetrics,
    summary="Get Model Validation Metrics & Confusion Matrix",
    description="Delivers actual Accuracy, F1-scores, 5x5 Confusion Matrix, and Gini Feature Importances.",
)
async def get_land_cover_validation(
    village_id: Optional[str] = Query(default=None, description="Village ID (optional filter)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> ModelValidationMetrics:
    """Retrieve comprehensive validation metrics, 5x5 confusion matrix, and feature importances."""
    target_village = village_id or villageId or "gosaba"
    try:
        return await get_land_cover_validation_service(village_id=target_village, year=year or 2025)
    except Exception as e:
        logger.error(f"Error fetching validation metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model validation metrics: {str(e)}",
        )


@router.get(
    "/land-cover/preview",
    response_model=LandCoverPreviewResponse,
    summary="Get Map-Ready Land Cover GeoJSON Preview",
    description="Retrieve map-ready GeoJSON FeatureCollection with polygon classifications for Leaflet overlay.",
)
async def get_land_cover_preview(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Observation year"),
) -> LandCoverPreviewResponse:
    """Retrieve map-ready GeoJSON preview payload for classified zones."""
    target_village = village_id or villageId or "gosaba"
    try:
        return await get_land_cover_preview_service(village_id=target_village, year=year or 2025)
    except Exception as e:
        logger.error(f"Error generating land-cover preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate land-cover preview.",
        )
