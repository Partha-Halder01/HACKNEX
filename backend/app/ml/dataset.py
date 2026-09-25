"""Training dataset loading, feature matrix construction, validation, and stratified splitting."""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from .features import LAND_COVER_FEATURES, validate_feature_dict, validate_feature_matrix
from .labels import LAND_COVER_CLASSES, validate_class_id

logger = logging.getLogger("sundarban.ml.dataset")


def load_training_geojson(
    file_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Load training GeoJSON FeatureCollection."""
    if file_path is None:
        file_path = (
            Path(__file__).resolve().parent.parent.parent
            / "data"
            / "training"
            / "sundarban_land_cover_training.geojson"
        )
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Training GeoJSON dataset not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if data.get("type") != "FeatureCollection":
        raise ValueError(f"Expected FeatureCollection, got {data.get('type')}")

    return data


def build_training_dataset(
    geojson_data: Optional[Dict[str, Any]] = None,
    samples_per_class: int = 200,
    random_state: int = 42,
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """Construct X feature matrix and y target vector with empirical multi-spectral augmentation.

    Returns:
        (X, y, dataset_metadata)
    """
    if geojson_data is None:
        geojson_data = load_training_geojson()

    features_raw = geojson_data.get("features", [])
    if not features_raw:
        raise ValueError("Training GeoJSON contains no features.")

    # Group baseline samples by class
    class_prototypes: Dict[int, List[Dict[str, float]]] = {cid: [] for cid in LAND_COVER_CLASSES}

    for feat in features_raw:
        props = feat.get("properties", {})
        cid = validate_class_id(props.get("classId"))
        spectral = props.get("spectral", {})
        if spectral:
            validate_feature_dict(spectral)
            class_prototypes[cid].append(spectral)

    # Verify all 5 classes are present
    missing_classes = [cid for cid, protos in class_prototypes.items() if len(protos) == 0]
    if missing_classes:
        raise ValueError(f"Training dataset is missing required classes: {missing_classes}")

    rng = np.random.default_rng(random_state)
    X_rows: List[List[float]] = []
    y_rows: List[int] = []

    # Augment realistic multi-spectral noise around empirical prototypes
    for cid, protos in class_prototypes.items():
        base_df = pd.DataFrame(protos)
        means = base_df.mean()
        stds = base_df.std().fillna(base_df.mean() * 0.05)

        for _ in range(samples_per_class):
            sample: Dict[str, float] = {}
            for col in LAND_COVER_FEATURES:
                noise = rng.normal(0, max(1.0, stds[col] * 0.8))
                val = float(means[col] + noise)
                if col in ("NDVI", "NDWI"):
                    val = max(-1.0, min(1.0, val))
                else:
                    val = max(10.0, val)
                sample[col] = val

            # Recalculate NDVI and NDWI dynamically to preserve physical spectral fidelity
            nir = sample["B8"]
            red = sample["B4"]
            green = sample["B3"]
            sample["NDVI"] = float((nir - red) / (nir + red)) if (nir + red) > 0 else 0.0
            sample["NDWI"] = float((green - nir) / (green + nir)) if (green + nir) > 0 else 0.0

            X_rows.append([sample[f] for f in LAND_COVER_FEATURES])
            y_rows.append(cid)

    X = validate_feature_matrix(np.array(X_rows, dtype=np.float64))
    y = np.array(y_rows, dtype=np.int64)

    # Calculate class distribution summary
    class_counts = {int(k): int(v) for k, v in zip(*np.unique(y, return_counts=True))}
    total_samples = len(y)
    class_distribution = {
        LAND_COVER_CLASSES[cid]: {
            "classId": cid,
            "count": class_counts.get(cid, 0),
            "percentage": round((class_counts.get(cid, 0) / total_samples) * 100, 2),
        }
        for cid in LAND_COVER_CLASSES
    }

    metadata = {
        "trainingDataSource": geojson_data.get("metadata", {}).get("trainingDataSource", "pilot_demo"),
        "totalSamples": total_samples,
        "featureCount": len(LAND_COVER_FEATURES),
        "features": LAND_COVER_FEATURES,
        "classCount": len(LAND_COVER_CLASSES),
        "classes": LAND_COVER_CLASSES,
        "classDistribution": class_distribution,
        "disclaimer": geojson_data.get("metadata", {}).get("disclaimer", "Pilot demonstration dataset."),
    }

    return X, y, metadata


def split_training_data(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.25,
    random_state: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Perform stratified train/validation split with deterministic random state."""
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
        shuffle=True,
    )
    logger.info(
        f"[Dataset] Split dataset: Train={X_train.shape[0]} samples, Validation={X_test.shape[0]} samples."
    )
    return X_train, X_test, y_train, y_test
