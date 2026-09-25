"""Change detection API endpoints for 2020 vs 2025 multi-temporal land-cover comparison."""
import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from ...schemas.change_detection import (
    ChangeDetectionResult,
    TransitionMatrix,
    ChangeDetectionPreviewResponse,
)
from ...services.change_detection import (
    get_change_detection_service,
    get_change_detection_transitions_service,
    get_change_detection_preview_service,
)
from ...ml.change_detection import (
    SpatialCoverageMismatchError,
    IncompatibleModelVersionError,
    InvalidTemporalComparisonError,
)

logger = logging.getLogger("sundarban.api.change_detection")

router = APIRouter(tags=["Change Detection"])


@router.get(
    "/change-detection",
    response_model=ChangeDetectionResult,
    summary="Get 2020 vs 2025 Land-Cover Change Detection",
    description="Retrieve multi-class transition metrics, gross mangrove gain/loss, net change, and environmental disturbance alerts.",
)
async def read_change_detection(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    from_year: Optional[int] = Query(default=2020, ge=2015, le=2030, description="Baseline observation year"),
    fromYear: Optional[int] = Query(default=None, description="CamelCase alias for from_year"),
    to_year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Comparison observation year"),
    toYear: Optional[int] = Query(default=None, description="CamelCase alias for to_year"),
) -> ChangeDetectionResult:
    """Retrieve canopy gain/loss metrics and thresholded disturbance alerts."""
    target_village = village_id or villageId
    if not target_village:
        raise HTTPException(
            status_code=422,
            detail="Query parameter 'village_id' or 'villageId' is required.",
        )
    effective_from = from_year if fromYear is None else fromYear
    effective_to = to_year if toYear is None else toYear

    try:
        return await get_change_detection_service(
            village_id=target_village,
            from_year=effective_from,
            to_year=effective_to,
        )
    except InvalidTemporalComparisonError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (SpatialCoverageMismatchError, IncompatibleModelVersionError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing change detection for {target_village}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute change detection: {str(e)}",
        )


@router.get(
    "/change-detection/transitions",
    response_model=TransitionMatrix,
    summary="Get 5x5 Land-Cover Transition Matrix",
    description="Retrieve full 5x5 transition matrix cell counts, hectare areas, and taxonomic transition percentages.",
)
async def read_change_detection_transitions(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    from_year: Optional[int] = Query(default=2020, ge=2015, le=2030, description="Baseline observation year"),
    fromYear: Optional[int] = Query(default=None, description="CamelCase alias for from_year"),
    to_year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Comparison observation year"),
    toYear: Optional[int] = Query(default=None, description="CamelCase alias for to_year"),
) -> TransitionMatrix:
    """Retrieve 5x5 land-cover transition matrix breakdown."""
    target_village = village_id or villageId or "gosaba"
    effective_from = from_year if fromYear is None else fromYear
    effective_to = to_year if toYear is None else toYear

    try:
        return await get_change_detection_transitions_service(
            village_id=target_village,
            from_year=effective_from,
            to_year=effective_to,
        )
    except InvalidTemporalComparisonError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving transition matrix for {target_village}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve transition matrix: {str(e)}",
        )


@router.get(
    "/change-detection/preview",
    response_model=ChangeDetectionPreviewResponse,
    summary="Get Map-Ready Change GeoJSON Preview",
    description="Retrieve map-ready GeoJSON FeatureCollection with classified transition polygons for Leaflet overlay.",
)
async def read_change_detection_preview(
    village_id: Optional[str] = Query(default=None, description="Village ID (e.g., gosaba, satjelia)"),
    villageId: Optional[str] = Query(default=None, description="CamelCase alias for village_id"),
    from_year: Optional[int] = Query(default=2020, ge=2015, le=2030, description="Baseline observation year"),
    fromYear: Optional[int] = Query(default=None, description="CamelCase alias for from_year"),
    to_year: Optional[int] = Query(default=2025, ge=2015, le=2030, description="Comparison observation year"),
    toYear: Optional[int] = Query(default=None, description="CamelCase alias for to_year"),
    include_low_confidence: Optional[bool] = Query(default=True, description="Whether to include low-confidence change polygons"),
    includeLowConfidence: Optional[bool] = Query(default=None, description="CamelCase alias for include_low_confidence"),
) -> ChangeDetectionPreviewResponse:
    """Retrieve map-ready GeoJSON preview payload for transition zones."""
    target_village = village_id or villageId or "gosaba"
    effective_from = from_year if fromYear is None else fromYear
    effective_to = to_year if toYear is None else toYear
    include_low = include_low_confidence if includeLowConfidence is None else includeLowConfidence

    try:
        return await get_change_detection_preview_service(
            village_id=target_village,
            from_year=effective_from,
            to_year=effective_to,
            include_low_confidence=include_low,
        )
    except InvalidTemporalComparisonError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating change preview for {target_village}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate change detection preview.",
        )
