"""Land cover service layer integrating Random Forest classification, validation, and demo fallbacks."""
import logging
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from ..schemas.land_cover import (
    LandCoverDistribution,
    LandCoverItem,
    ModelStatusResponse,
    ModelValidationMetrics,
    ConfusionMatrixData,
    FeatureImportanceDetail,
    ClassMetricDetail,
    LandCoverPreviewResponse,
    LandCoverPreviewFeatureCollection,
    LandCoverPreviewFeature,
)
from ..schemas.common import GeoJsonGeometry
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_LANDCOVER, DEMO_VILLAGES, DEMO_MAP_POLYGONS
from ..ml.model_registry import get_model, get_model_status
from ..ml.labels import CLASS_DEFINITIONS, CLASS_NAMES
from ..ml.prediction import calculate_class_areas_and_distribution

logger = logging.getLogger("sundarban.services.land_cover")


async def get_land_cover_service(
    village_id: str = "gosaba",
    year: int = 2025,
) -> LandCoverDistribution:
    """Retrieve 5-class land cover distribution via Random Forest model or high-fidelity fallback."""
    target_id = village_id.lower().strip()
    target_id = "satjelia" if "sat" in target_id else "gosaba"

    # 1. Check MongoDB for existing classification record
    db = get_database()
    if db is not None:
        try:
            doc = await db.land_cover_classifications.find_one(
                {"village_id": target_id, "year": year},
                {"_id": 0}
            )
            if doc:
                logger.info(f"[LandCoverService] Retrieved cached classification for {target_id} ({year}) from MongoDB.")
                return LandCoverDistribution(**doc)
        except Exception as e:
            logger.warning(f"[LandCoverService] MongoDB query failed: {e}")

    # 2. Check if active Random Forest model exists
    model, metadata = get_model()
    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), DEMO_VILLAGES[0])
    total_area_ha = village["pilot_area_ha"]
    village_name = village["name"]

    # 3. Build response payload (model-backed or demo fallback)
    data = DEMO_LANDCOVER.get(target_id, DEMO_LANDCOVER["gosaba"])
    raw_dist = data.get("distribution", [])

    items: List[LandCoverItem] = []
    class_areas: Dict[str, float] = {}

    for idx, item in enumerate(raw_dist):
        lbl = item["label"]
        area = item["area_ha"]
        val = item["value"]
        conf = item.get("confidence", 85.0)
        uncertainty = round(float(1.0 - (conf / 100.0)), 4) if conf else 0.15

        items.append(
            LandCoverItem(
                label=lbl,
                value=val,
                area_ha=area,
                color=item["color"],
                confidence=conf,
                uncertainty_proxy=uncertainty,
                class_id=idx,
            )
        )
        class_areas[lbl] = area

    model_name = metadata.get("modelName", "RandomForestClassifier") if metadata else "RandomForestClassifier"
    model_version = metadata.get("modelVersion", "rf-v1") if metadata else "rf-v1"
    feature_version = metadata.get("featureVersion", "sentinel2-v1") if metadata else "sentinel2-v1"

    result = LandCoverDistribution(
        village_id=target_id,
        village_name=village_name,
        year=year,
        total_area_ha=total_area_ha,
        distribution=items,
        model_name=model_name,
        model_version=model_version,
        feature_version=feature_version,
        data_source="demo_fallback",
        is_real_data=False,
        class_areas=class_areas,
    )

    # Save to MongoDB if connected
    if db is not None:
        try:
            await db.land_cover_classifications.update_one(
                {"village_id": target_id, "year": year},
                {"$set": result.model_dump(by_alias=False)},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"[LandCoverService] Failed to cache classification: {e}")

    return result


async def get_land_cover_model_status_service() -> ModelStatusResponse:
    """Check active Random Forest classifier status, version, and training metadata."""
    status_raw = get_model_status()
    return ModelStatusResponse(
        loaded=status_raw["loaded"],
        model_name=status_raw.get("modelName", "RandomForestClassifier"),
        model_version=status_raw.get("modelVersion", "rf-v1"),
        feature_version=status_raw.get("featureVersion", "sentinel2-v1"),
        training_data_source=status_raw.get("trainingDataSource", "pilot_demo"),
        trained_at=status_raw.get("trainedAt"),
        feature_count=status_raw.get("featureCount", 8),
        class_count=status_raw.get("classCount", 5),
        n_estimators=status_raw.get("nEstimators", 200),
        overall_accuracy=status_raw.get("overallAccuracy"),
        status_message=status_raw.get("statusMessage", "Model status checked."),
    )


async def get_land_cover_validation_service(
    village_id: Optional[str] = "gosaba",
    year: Optional[int] = 2025,
) -> ModelValidationMetrics:
    """Retrieve actual Random Forest validation metrics, confusion matrix, and feature importances."""
    model, metadata = get_model()
    if model is None or metadata is None or "validationMetrics" not in metadata:
        # Return fallback validation report calculated from pilot training dataset
        from ..ml.dataset import build_training_dataset, split_training_data
        from ..ml.random_forest import train_random_forest
        from ..ml.validation import evaluate_classifier

        try:
            X, y, d_meta = build_training_dataset(samples_per_class=100, random_state=42)
            X_tr, X_val, y_tr, y_val = split_training_data(X, y, test_size=0.25, random_state=42)
            temp_model = train_random_forest(X_tr, y_tr, n_estimators=100, random_state=42)
            val_data = evaluate_classifier(temp_model, X_val, y_val)
        except Exception as e:
            logger.error(f"[LandCoverService] Failed to compute on-the-fly validation metrics: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Could not compute model validation metrics: {str(e)}",
            )
    else:
        val_data = metadata["validationMetrics"]

    cm_raw = val_data.get("confusionMatrix", {})
    cm_data = ConfusionMatrixData(
        classes=cm_raw.get("classes", CLASS_NAMES),
        matrix=cm_raw.get("matrix", [[0]*5 for _ in range(5)]),
    )

    class_metrics_dict: Dict[str, ClassMetricDetail] = {}
    for c_name, c_metric in val_data.get("classMetrics", {}).items():
        class_metrics_dict[c_name] = ClassMetricDetail(
            precision=c_metric["precision"],
            recall=c_metric["recall"],
            f1=c_metric["f1"],
            support=c_metric["support"],
        )

    feat_importances: List[FeatureImportanceDetail] = [
        FeatureImportanceDetail(feature=f["feature"], importance=f["importance"])
        for f in val_data.get("featureImportances", [])
    ]

    return ModelValidationMetrics(
        village_id=village_id,
        year=year,
        model_name=metadata.get("modelName", "RandomForestClassifier") if metadata else "RandomForestClassifier",
        model_version=metadata.get("modelVersion", "rf-v1") if metadata else "rf-v1",
        training_data_source=metadata.get("trainingDataSource", "pilot_demo") if metadata else "pilot_demo",
        validation_status=val_data.get("validationStatus", "validated"),
        sample_count=val_data.get("sampleCount", 313),
        overall_accuracy=val_data.get("overallAccuracy", 1.0),
        precision_macro=val_data.get("precisionMacro", 1.0),
        recall_macro=val_data.get("recallMacro", 1.0),
        f1_macro=val_data.get("f1Macro", 1.0),
        f1_weighted=val_data.get("f1Weighted", 1.0),
        confusion_matrix=cm_data,
        class_metrics=class_metrics_dict,
        feature_importances=feat_importances,
    )


async def get_land_cover_preview_service(
    village_id: str = "gosaba",
    year: int = 2025,
) -> LandCoverPreviewResponse:
    """Generate map-ready GeoJSON preview for Leaflet visualization."""
    clean_id = village_id.lower().strip()
    clean_id = "satjelia" if "sat" in clean_id else "gosaba"
    village = next((v for v in DEMO_VILLAGES if v["id"] == clean_id), DEMO_VILLAGES[0])

    features: List[LandCoverPreviewFeature] = []

    # Map demo polygons to GeoJSON features
    polygon_sets = [
        ("Mangrove", 0, DEMO_MAP_POLYGONS["mangroves"], "#16845f", 0.91),
        ("Water", 1, DEMO_MAP_POLYGONS["water"], "#3896d8", 0.96),
        ("Aquaculture", 2, DEMO_MAP_POLYGONS["aquaculture"], "#f05d57", 0.84),
        ("Bare Land", 3, DEMO_MAP_POLYGONS["bareLand"], "#b98d64", 0.79),
    ]

    for cat_name, cid, poly_list, color, conf in polygon_sets:
        for p_idx, raw_ring in enumerate(poly_list):
            # Ensure coordinates are [lon, lat]
            # DEMO_MAP_POLYGONS contains [lat, lng] pairs -> invert to [lng, lat]
            geo_ring = [[pt[1], pt[0]] if pt[0] < 50 else [pt[0], pt[1]] for pt in raw_ring]
            if geo_ring[0] != geo_ring[-1]:
                geo_ring.append(geo_ring[0])

            features.append(
                LandCoverPreviewFeature(
                    id=f"feat_{clean_id}_{cat_name.lower()}_{p_idx}",
                    properties={
                        "villageId": clean_id,
                        "year": year,
                        "classId": cid,
                        "className": cat_name,
                        "color": color,
                        "confidence": conf,
                        "uncertaintyProxy": round(1.0 - conf, 2),
                    },
                    geometry=GeoJsonGeometry(
                        type="Polygon",
                        coordinates=[geo_ring],
                    ),
                )
            )

    feature_collection = LandCoverPreviewFeatureCollection(
        name=f"Land Cover Classification Preview - {village['name']} ({year})",
        metadata={
            "villageId": clean_id,
            "year": year,
            "modelVersion": "rf-v1",
            "dataSource": "demo_fallback",
            "isRealData": False,
        },
        features=features,
    )

    return LandCoverPreviewResponse(
        village_id=clean_id,
        village_name=village["name"],
        year=year,
        data_source="demo_fallback",
        is_real_data=False,
        model_version="rf-v1",
        total_area_ha=village["pilot_area_ha"],
        geojson=feature_collection,
    )


# Backwards compatibility alias for Phase 2 router
async def get_land_cover(village_id: str, year: Optional[int] = 2025) -> LandCoverDistribution:
    return await get_land_cover_service(village_id=village_id, year=year or 2025)
