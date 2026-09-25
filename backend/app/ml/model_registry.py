"""Lightweight model registry and status management."""
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier

from .labels import LAND_COVER_CLASSES
from .random_forest import DEFAULT_MODEL_DIR, load_model_artifact

logger = logging.getLogger("sundarban.ml.registry")

# Active cached model state
_cached_model: Optional[RandomForestClassifier] = None
_cached_metadata: Optional[Dict[str, Any]] = None
_model_name: str = "random_forest_v1"


def get_model(
    model_name: str = "random_forest_v1",
    model_dir: Optional[Path] = None,
    force_reload: bool = False,
) -> Tuple[Optional[RandomForestClassifier], Optional[Dict[str, Any]]]:
    """Retrieve the active trained Random Forest model and metadata from cache or disk."""
    global _cached_model, _cached_metadata, _model_name
    if _cached_model is not None and not force_reload and _model_name == model_name:
        return _cached_model, _cached_metadata

    try:
        model, metadata = load_model_artifact(model_dir=model_dir, model_name=model_name)
        _cached_model = model
        _cached_metadata = metadata
        _model_name = model_name
        logger.info(f"[ModelRegistry] Successfully loaded active model: {model_name}")
        return _cached_model, _cached_metadata
    except FileNotFoundError:
        logger.info(f"[ModelRegistry] Model artifact '{model_name}' not found on disk.")
        return None, None
    except Exception as e:
        logger.warning(f"[ModelRegistry] Error loading model '{model_name}': {e}")
        return None, None


def register_model_in_memory(
    model: RandomForestClassifier,
    metadata: Dict[str, Any],
    model_name: str = "random_forest_v1",
) -> None:
    """Set in-memory cached model instance (useful for unit tests & dynamic training)."""
    global _cached_model, _cached_metadata, _model_name
    _cached_model = model
    _cached_metadata = metadata
    _model_name = model_name
    logger.info(f"[ModelRegistry] Registered in-memory model: {model_name}")


def get_model_status(model_name: str = "random_forest_v1") -> Dict[str, Any]:
    """Retrieve operational status and metadata of the active classifier."""
    model, metadata = get_model(model_name=model_name)
    if model is None or metadata is None:
        return {
            "loaded": False,
            "modelName": "RandomForestClassifier",
            "modelVersion": "rf-v1",
            "featureVersion": "sentinel2-v1",
            "trainingDataSource": "pilot_demo",
            "trainedAt": None,
            "featureCount": 8,
            "classCount": 5,
            "statusMessage": "Model artifact not trained yet. Using high-fidelity demo fallback.",
        }

    classes_dict = (
        metadata.get("classMapping")
        or metadata.get("classes")
        or metadata.get("classDistribution")
        or LAND_COVER_CLASSES
    )

    return {
        "loaded": True,
        "modelName": metadata.get("modelName", "RandomForestClassifier"),
        "modelVersion": metadata.get("modelVersion", "rf-v1"),
        "featureVersion": metadata.get("featureVersion", "sentinel2-v1"),
        "trainingDataSource": metadata.get("trainingDataSource", "pilot_demo"),
        "trainedAt": metadata.get("trainingTimestamp"),
        "featureCount": len(metadata.get("features", [])),
        "classCount": len(classes_dict),
        "nEstimators": metadata.get("hyperparameters", {}).get("nEstimators", 200),
        "overallAccuracy": metadata.get("validationMetrics", {}).get("overallAccuracy"),
        "statusMessage": "Active Random Forest model loaded and operational.",
    }
