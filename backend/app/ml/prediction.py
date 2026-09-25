"""Land-cover prediction, probability estimation, confidence/uncertainty scoring, and area calculation."""
import logging
from typing import Any, Dict, List, Optional, Sequence, Union
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from .features import validate_feature_matrix
from .labels import CLASS_DEFINITIONS, CLASS_NAMES, LAND_COVER_CLASSES, get_class_name

logger = logging.getLogger("sundarban.ml.prediction")


def predict_sample(
    model: RandomForestClassifier,
    feature_vector: Sequence[float],
) -> Dict[str, Any]:
    """Classify a single 8-dimensional feature vector with confidence and uncertainty proxy."""
    X_mat = validate_feature_matrix([feature_vector])
    pred_class_id = int(model.predict(X_mat)[0])
    probabilities_raw = model.predict_proba(X_mat)[0]

    # Map probabilities to classes
    probs_dict: Dict[str, float] = {}
    for idx, prob in enumerate(probabilities_raw):
        if idx in LAND_COVER_CLASSES:
            probs_dict[LAND_COVER_CLASSES[idx]] = round(float(prob), 4)

    confidence = round(float(np.max(probabilities_raw)), 4)
    uncertainty_proxy = round(float(1.0 - confidence), 4)

    return {
        "classId": pred_class_id,
        "className": get_class_name(pred_class_id),
        "confidence": confidence,
        "uncertaintyProxy": uncertainty_proxy,
        "probabilities": probs_dict,
    }


def predict_batch(
    model: RandomForestClassifier,
    X_features: Union[np.ndarray, Sequence[Sequence[float]]],
) -> List[Dict[str, Any]]:
    """Classify multiple feature vectors."""
    X_mat = validate_feature_matrix(X_features)
    preds = model.predict(X_mat)
    probs_matrix = model.predict_proba(X_mat)

    results: List[Dict[str, Any]] = []
    for pred_id, probs in zip(preds, probs_matrix):
        cid = int(pred_id)
        probs_dict = {
            LAND_COVER_CLASSES[i]: round(float(p), 4)
            for i, p in enumerate(probs)
            if i in LAND_COVER_CLASSES
        }
        conf = round(float(np.max(probs)), 4)
        results.append({
            "classId": cid,
            "className": get_class_name(cid),
            "confidence": conf,
            "uncertaintyProxy": round(float(1.0 - conf), 4),
            "probabilities": probs_dict,
        })

    return results


def calculate_class_areas_and_distribution(
    class_predictions: Sequence[int],
    total_area_ha: Optional[float] = None,
    pixel_resolution_m: int = 20,
) -> Dict[str, Any]:
    """Calculate classified land-cover area (in hectares) and percentage distribution.

    Args:
        class_predictions: Sequence of integer class IDs (0..4).
        total_area_ha: If provided, scales proportions to the known sector area;
                       otherwise calculates from pixel counts (1 pixel at 20m = 0.04 ha).
        pixel_resolution_m: Native/resampled spatial resolution in meters (default: 20m).

    Returns:
        Structured distribution and area breakdown.
    """
    preds_arr = np.asarray(class_predictions, dtype=np.int64)
    total_pixels = len(preds_arr)

    if total_pixels == 0:
        return {
            "totalAreaHa": 0.0,
            "distribution": [],
            "classAreas": {name: 0.0 for name in CLASS_NAMES},
        }

    pixel_area_ha = (pixel_resolution_m * pixel_resolution_m) / 10000.0
    computed_total_ha = total_area_ha or (total_pixels * pixel_area_ha)

    unique_classes, counts = np.unique(preds_arr, return_counts=True)
    count_map = dict(zip(unique_classes, counts))

    distribution: List[Dict[str, Any]] = []
    class_areas: Dict[str, float] = {}

    for cid in range(len(CLASS_NAMES)):
        c_name = CLASS_NAMES[cid]
        c_count = int(count_map.get(cid, 0))
        percentage = round((c_count / total_pixels) * 100, 2)
        area_ha = round((percentage / 100.0) * computed_total_ha, 1)

        class_def = CLASS_DEFINITIONS.get(cid, {})

        distribution.append({
            "classId": cid,
            "label": c_name,
            "value": percentage,
            "areaHa": area_ha,
            "color": class_def.get("color", "#2da66b"),
            "pixelCount": c_count,
        })
        class_areas[c_name] = area_ha

    return {
        "totalAreaHa": round(computed_total_ha, 1),
        "distribution": distribution,
        "classAreas": class_areas,
        "pixelResolutionMeters": pixel_resolution_m,
        "areaCalculationMethod": "pixel_count_zonal_proportions",
    }
