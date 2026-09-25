"""Change detection service layer with 5x5 transition analysis, MongoDB persistence, and demo fallback."""
import logging
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException

from ..schemas.change_detection import (
    ChangeDetectionResult,
    ChangeMetric,
    EnvironmentalAlert,
    MangroveChangeSummary,
    MangroveLossBreakdown,
    MangroveGainBreakdown,
    ConfidenceSummary,
    TransitionMatrix,
    TransitionMatrixCell,
    ChangeDetectionModelMetadata,
    ChangeDetectionPreviewResponse,
    ChangePreviewFeature,
    ChangePreviewFeatureCollection,
)
from ..schemas.common import GeoJsonGeometry
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES, DEMO_MAP_POLYGONS
from ..ml.change_detection import (
    CELL_AREA_HECTARES,
    CELL_SIZE_METERS,
    DEFAULT_CONFIDENCE_THRESHOLD,
    DEFAULT_SEASONAL_WINDOW,
    CHANGE_CATEGORY_STABLE,
    CHANGE_CATEGORY_MANGROVE_LOSS,
    CHANGE_CATEGORY_MANGROVE_GAIN,
    CHANGE_CATEGORY_CLASS_CONVERSION,
    CHANGE_CATEGORY_LOW_CONFIDENCE,
    validate_temporal_consistency,
    validate_model_compatibility,
    compute_transition_matrix,
)

logger = logging.getLogger("sundarban.services.change_detection")

# Baseline deterministic sector classification distributions for change modeling
# Gosaba total area: 1,245 ha = 31,125 cells of 0.04 ha
# Satjelia total area: 980 ha = 24,500 cells of 0.04 ha
_SECTOR_CELL_COUNTS = {
    "gosaba": {
        "totalCells": 31125,
        "totalAreaHa": 1245.0,
        # 2020 Baseline: Mangrove 750.6 ha (18765), Water 310.0 ha (7750), Aqua 112.1 ha (2803), Bare 44.4 ha (1110), Other 27.9 ha (697)
        # 2025 Observed: Mangrove 775.6 ha (19390), Water 300.0 ha (7500), Aqua 108.3 ha (2708), Bare 34.9 ha (872), Other 26.2 ha (655)
        # Net gain: +25.0 ha (Gain: 34.6 ha [865 cells], Loss: 9.6 ha [240 cells], Stable Mangrove: 741.0 ha [18525 cells])
        "matrixCounts": [
            [18525, 145, 95, 0, 0],      # Row 0: 2020 Mangrove -> [18525 M, 145 W, 95 A, 0 B, 0 V] (Loss: 240 cells = 9.6 ha)
            [455, 7045, 0, 0, 0],        # Row 1: 2020 Water    -> [455 M, 7045 W, 0 A, 0 B, 0 V]   (Gain: 455 cells = 18.2 ha)
            [100, 0, 2613, 0, 90],       # Row 2: 2020 Aqua     -> [100 M, 0 W, 2613 A, 0 B, 90 V]  (Gain: 100 cells = 4.0 ha)
            [310, 310, 0, 490, 0],       # Row 3: 2020 Bare     -> [310 M, 310 W, 0 A, 490 B, 0 V]  (Gain: 310 cells = 12.4 ha)
            [0, 0, 0, 382, 315],         # Row 4: 2020 Other    -> [0 M, 0 W, 0 A, 382 B, 315 V]
        ],
    },
    "satjelia": {
        "totalCells": 24500,
        "totalAreaHa": 980.0,
        # 2020 Baseline: Mangrove 554.0 ha (13850), Water 285.0 ha (7125), Aqua 81.2 ha (2030), Bare 36.8 ha (920), Other 23.0 ha (575)
        # 2025 Observed: Mangrove 569.4 ha (14235), Water 278.3 ha (6958), Aqua 77.4 ha (1935), Bare 31.4 ha (785), Other 23.5 ha (587)
        # Net gain: +15.4 ha (Gain: 21.8 ha [545 cells], Loss: 6.4 ha [160 cells], Stable Mangrove: 547.6 ha [13690 cells])
        "matrixCounts": [
            [13690, 105, 55, 0, 0],      # Row 0: 2020 Mangrove -> [13690 M, 105 W, 55 A, 0 B, 0 V] (Loss: 160 cells = 6.4 ha)
            [312, 6813, 0, 0, 0],        # Row 1: 2020 Water    -> [312 M, 6813 W, 0 A, 0 B, 0 V]   (Gain: 312 cells = 12.5 ha)
            [50, 0, 1880, 0, 100],       # Row 2: 2020 Aqua     -> [50 M, 0 W, 1880 A, 0 B, 100 V]  (Gain: 50 cells = 2.0 ha)
            [183, 40, 0, 697, 0],        # Row 3: 2020 Bare     -> [183 M, 40 W, 0 A, 697 B, 0 V]   (Gain: 183 cells = 7.3 ha)
            [0, 0, 0, 88, 487],          # Row 4: 2020 Other    -> [0 M, 0 W, 0 A, 88 B, 487 V]
        ],
    },
}


def _build_synthetic_classification_grids(
    village_id: str,
) -> Tuple[List[int], List[int], List[float], List[float]]:
    """Generate aligned pixel/cell classification arrays based on authoritative sector baselines."""
    clean_id = "satjelia" if "sat" in village_id.lower() else "gosaba"
    sector_info = _SECTOR_CELL_COUNTS[clean_id]
    matrix = sector_info["matrixCounts"]

    grid_2020: List[int] = []
    grid_2025: List[int] = []
    conf_2020: List[float] = []
    conf_2025: List[float] = []

    for from_c in range(5):
        for to_c in range(5):
            count = matrix[from_c][to_c]
            grid_2020.extend([from_c] * count)
            grid_2025.extend([to_c] * count)

            # Assign realistic confidence profiles
            if from_c == to_c:
                c1 = 0.94 if from_c in (0, 1) else 0.88
                c2 = 0.93 if to_c in (0, 1) else 0.87
            else:
                c1 = 0.86
                c2 = 0.84
            conf_2020.extend([c1] * count)
            conf_2025.extend([c2] * count)

    return grid_2020, grid_2025, conf_2020, conf_2025


async def get_change_detection_service(
    village_id: str,
    from_year: int = 2020,
    to_year: int = 2025,
) -> ChangeDetectionResult:
    """Retrieve full change detection analysis, 5x5 transition matrix, and environmental disturbance alerts."""
    target_id = village_id.lower().strip()
    target_id = "satjelia" if "sat" in target_id else "gosaba"

    validate_temporal_consistency(from_year=from_year, to_year=to_year)

    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), DEMO_VILLAGES[0])

    # 1. Attempt retrieval from MongoDB
    db = get_database()
    if db is not None:
        try:
            doc = await db.change_detection.find_one(
                {"village_id": target_id, "from_year": from_year, "to_year": to_year},
                {"_id": 0},
            )
            if doc:
                return ChangeDetectionResult(**doc)
        except Exception as e:
            logger.warning(f"[ChangeDetectionService] Error querying MongoDB: {e}")

    # 2. Compute spatial transition matrix from classification grids
    grid_2020, grid_2025, conf_2020, conf_2025 = _build_synthetic_classification_grids(target_id)
    analysis = compute_transition_matrix(
        grid_baseline=grid_2020,
        grid_comparison=grid_2025,
        conf_baseline=conf_2020,
        conf_comparison=conf_2025,
        cell_area_ha=CELL_AREA_HECTARES,
        confidence_threshold=DEFAULT_CONFIDENCE_THRESHOLD,
    )

    mg_summary = analysis["mangroveSummary"]
    cf_summary = analysis["confidenceSummary"]

    transition_cells = [TransitionMatrixCell(**t) for t in analysis["transitions"]]
    transition_matrix = TransitionMatrix(
        classes=analysis["classes"],
        matrix=analysis["matrixCounts"],
        area_matrix_ha=analysis["matrixAreasHa"],
        transitions=transition_cells,
    )

    mangrove_change = MangroveChangeSummary(
        baseline_year=from_year,
        comparison_year=to_year,
        baseline_mangrove_ha=mg_summary["baselineMangroveHa"],
        comparison_mangrove_ha=mg_summary["comparisonMangroveHa"],
        gross_gain_ha=mg_summary["grossGainHa"],
        gross_loss_ha=mg_summary["grossLossHa"],
        net_change_ha=mg_summary["netChangeHa"],
        percent_change=mg_summary["percentChange"],
        stable_mangrove_ha=mg_summary["stableMangroveHa"],
        loss_breakdown=MangroveLossBreakdown(**mg_summary["lossBreakdown"]),
        gain_breakdown=MangroveGainBreakdown(**mg_summary["gainBreakdown"]),
    )

    confidence_summary = ConfidenceSummary(
        mean_confidence_2020=cf_summary["meanConfidence2020"],
        mean_confidence_2025=cf_summary["meanConfidence2025"],
        mean_change_confidence=cf_summary["meanChangeConfidence"],
        confidence_threshold=cf_summary["confidenceThreshold"],
        low_confidence_change_cells=cf_summary["lowConfidenceChangeCells"],
        low_confidence_change_area_ha=cf_summary["lowConfidenceChangeAreaHa"],
        confidence_score=cf_summary["confidenceScore"],
    )

    metrics = [
        ChangeMetric(
            category="Mangrove Gain",
            area_ha=mg_summary["grossGainHa"],
            percentage_change=round((mg_summary["grossGainHa"] / mg_summary["baselineMangroveHa"]) * 100.0, 1),
            trend="gain",
        ),
        ChangeMetric(
            category="Mangrove Loss",
            area_ha=mg_summary["grossLossHa"],
            percentage_change=round((mg_summary["grossLossHa"] / mg_summary["baselineMangroveHa"]) * 100.0, 1),
            trend="loss",
        ),
        ChangeMetric(
            category="Water Change",
            area_ha=round(analysis["matrixAreasHa"][1][0] + analysis["matrixAreasHa"][0][1], 1),
            percentage_change=1.2,
            trend="neutral",
        ),
        ChangeMetric(
            category="Mangrove → Aquaculture Transition",
            area_ha=round(analysis["matrixAreasHa"][0][2], 1),
            percentage_change=0.9,
            trend="loss",
        ),
    ]

    alerts = [
        EnvironmentalAlert(
            id=f"alt-{target_id}-1",
            severity="medium",
            color="#f5b814",
            title="Mangrove → Water Transition",
            location=f"{village['name']} Estuary",
            date=f"March {to_year}",
            description="An estimated mangrove-to-water land-cover transition was detected in the change-detection results. Field verification is recommended before interpreting the underlying cause.",
            affected_area_ha=mg_summary["lossBreakdown"]["toWaterHa"],
        ),
        EnvironmentalAlert(
            id=f"alt-{target_id}-2",
            severity="positive",
            color="#16845f",
            title="Mangrove Gain Detected",
            location=f"{village['name']} Intertidal Flat",
            date=f"February {to_year}",
            description="An estimated transition into the mangrove class was detected in the change-detection results. Field verification is recommended before interpreting the ecological cause.",
            affected_area_ha=mg_summary["gainBreakdown"]["fromBareLandHa"],
        ),
    ]

    model_metadata = ChangeDetectionModelMetadata(
        model_name="RandomForestClassifier",
        model_version="rf-v1",
        feature_version="sentinel2-v1",
        cell_size_meters=CELL_SIZE_METERS,
        cell_area_ha=CELL_AREA_HECTARES,
        seasonal_window=DEFAULT_SEASONAL_WINDOW,
        collection_id="COPERNICUS/S2_SR_HARMONIZED",
    )

    result = ChangeDetectionResult(
        village_id=target_id,
        village_name=village["name"],
        from_year=from_year,
        to_year=to_year,
        gain_ha=mg_summary["grossGainHa"],
        loss_ha=mg_summary["grossLossHa"],
        net_change_ha=mg_summary["netChangeHa"],
        confidence_score=cf_summary["confidenceScore"],
        mangrove_summary=mangrove_change,
        confidence_summary=confidence_summary,
        transition_matrix=transition_matrix,
        stable_areas_ha=analysis["stableAreasHa"],
        metrics=metrics,
        alerts=alerts,
        model=model_metadata,
        data_source="demo_fallback",
        is_real_data=False,
    )

    # Cache in MongoDB if available
    if db is not None:
        try:
            doc_dict = result.model_dump(by_alias=True)
            await db.change_detection.update_one(
                {"village_id": target_id, "from_year": from_year, "to_year": to_year},
                {"$set": doc_dict},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"[ChangeDetectionService] Error saving to MongoDB: {e}")

    return result


async def get_change_detection_transitions_service(
    village_id: str,
    from_year: int = 2020,
    to_year: int = 2025,
) -> TransitionMatrix:
    """Retrieve detailed 5x5 land-cover transition matrix."""
    res = await get_change_detection_service(village_id=village_id, from_year=from_year, to_year=to_year)
    if res.transition_matrix is None:
        raise HTTPException(status_code=500, detail="Transition matrix could not be computed.")
    return res.transition_matrix


async def get_change_detection_preview_service(
    village_id: str,
    from_year: int = 2020,
    to_year: int = 2025,
    include_low_confidence: bool = True,
) -> ChangeDetectionPreviewResponse:
    """Generate map-ready GeoJSON preview for Leaflet change overlay."""
    target_id = village_id.lower().strip()
    target_id = "satjelia" if "sat" in target_id else "gosaba"
    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), DEMO_VILLAGES[0])

    features: List[ChangePreviewFeature] = []

    # Map transition representative polygons
    # 1. Stable Mangrove
    poly_stable = DEMO_MAP_POLYGONS["mangroves"][0]
    geo_stable = [[pt[1], pt[0]] if pt[0] < 50 else [pt[0], pt[1]] for pt in poly_stable]
    if geo_stable[0] != geo_stable[-1]:
        geo_stable.append(geo_stable[0])

    features.append(
        ChangePreviewFeature(
            id=f"change_{target_id}_stable_mangrove",
            properties={
                "fromClassId": 0,
                "fromClassName": "Mangrove",
                "toClassId": 0,
                "toClassName": "Mangrove",
                "transition": "Mangrove -> Mangrove",
                "areaHa": 741.0 if target_id == "gosaba" else 547.6,
                "confidence2020": 0.94,
                "confidence2025": 0.93,
                "changeConfidence": 0.93,
                "isStable": True,
                "isLowConfidence": False,
                "changeCategory": CHANGE_CATEGORY_STABLE,
                "color": "#16845f",
            },
            geometry=GeoJsonGeometry(type="Polygon", coordinates=[geo_stable]),
        )
    )

    # 2. Mangrove Loss (Transition to Water)
    poly_water = DEMO_MAP_POLYGONS["water"][0]
    geo_loss_water = [[pt[1], pt[0]] if pt[0] < 50 else [pt[0], pt[1]] for pt in poly_water]
    if geo_loss_water[0] != geo_loss_water[-1]:
        geo_loss_water.append(geo_loss_water[0])

    features.append(
        ChangePreviewFeature(
            id=f"change_{target_id}_loss_water",
            properties={
                "fromClassId": 0,
                "fromClassName": "Mangrove",
                "toClassId": 1,
                "toClassName": "Water",
                "transition": "Mangrove -> Water",
                "areaHa": 5.8 if target_id == "gosaba" else 4.2,
                "confidence2020": 0.89,
                "confidence2025": 0.91,
                "changeConfidence": 0.89,
                "isStable": False,
                "isLowConfidence": False,
                "changeCategory": CHANGE_CATEGORY_MANGROVE_LOSS,
                "color": "#ef4444",
            },
            geometry=GeoJsonGeometry(type="Polygon", coordinates=[geo_loss_water]),
        )
    )

    # 3. Mangrove Loss (Transition to Aquaculture)
    poly_aqua = DEMO_MAP_POLYGONS["aquaculture"][0]
    geo_loss_aqua = [[pt[1], pt[0]] if pt[0] < 50 else [pt[0], pt[1]] for pt in poly_aqua]
    if geo_loss_aqua[0] != geo_loss_aqua[-1]:
        geo_loss_aqua.append(geo_loss_aqua[0])

    features.append(
        ChangePreviewFeature(
            id=f"change_{target_id}_loss_aqua",
            properties={
                "fromClassId": 0,
                "fromClassName": "Mangrove",
                "toClassId": 2,
                "toClassName": "Aquaculture",
                "transition": "Mangrove -> Aquaculture",
                "areaHa": 3.8 if target_id == "gosaba" else 2.2,
                "confidence2020": 0.85,
                "confidence2025": 0.83,
                "changeConfidence": 0.83,
                "isStable": False,
                "isLowConfidence": False,
                "changeCategory": CHANGE_CATEGORY_MANGROVE_LOSS,
                "color": "#f97316",
            },
            geometry=GeoJsonGeometry(type="Polygon", coordinates=[geo_loss_aqua]),
        )
    )

    # 4. Mangrove Gain (Transition from Bare Land)
    poly_bare = DEMO_MAP_POLYGONS["bareLand"][0]
    geo_gain_bare = [[pt[1], pt[0]] if pt[0] < 50 else [pt[0], pt[1]] for pt in poly_bare]
    if geo_gain_bare[0] != geo_gain_bare[-1]:
        geo_gain_bare.append(geo_gain_bare[0])

    features.append(
        ChangePreviewFeature(
            id=f"change_{target_id}_gain_bare",
            properties={
                "fromClassId": 3,
                "fromClassName": "Bare Land",
                "toClassId": 0,
                "toClassName": "Mangrove",
                "transition": "Bare Land -> Mangrove",
                "areaHa": 12.4 if target_id == "gosaba" else 7.3,
                "confidence2020": 0.82,
                "confidence2025": 0.88,
                "changeConfidence": 0.82,
                "isStable": False,
                "isLowConfidence": False,
                "changeCategory": CHANGE_CATEGORY_MANGROVE_GAIN,
                "color": "#22c55e",
            },
            geometry=GeoJsonGeometry(type="Polygon", coordinates=[geo_gain_bare]),
        )
    )

    # Filter out low-confidence changes if requested
    if not include_low_confidence:
        features = [f for f in features if not f.properties.get("isLowConfidence", False)]

    feature_collection = ChangePreviewFeatureCollection(
        name=f"Land Cover Change Preview - {village['name']} ({from_year} vs {to_year})",
        metadata={
            "villageId": target_id,
            "fromYear": from_year,
            "toYear": to_year,
            "includeLowConfidence": include_low_confidence,
            "modelVersion": "rf-v1",
            "dataSource": "demo_fallback",
            "isRealData": False,
        },
        features=features,
    )

    return ChangeDetectionPreviewResponse(
        village_id=target_id,
        village_name=village["name"],
        from_year=from_year,
        to_year=to_year,
        data_source="demo_fallback",
        is_real_data=False,
        model_version="rf-v1",
        total_area_ha=village["pilot_area_ha"],
        geojson=feature_collection,
    )


# Backward-compatible wrapper
async def get_change_detection(
    village_id: str,
    from_year: Optional[int] = 2020,
    to_year: Optional[int] = 2025,
) -> ChangeDetectionResult:
    """Legacy backward-compatible signature."""
    return await get_change_detection_service(
        village_id=village_id,
        from_year=from_year or 2020,
        to_year=to_year or 2025,
    )
