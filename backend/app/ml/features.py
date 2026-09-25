"""Feature definitions, extraction, validation, and data leakage protection."""
import logging
from typing import Any, Dict, List, Optional, Sequence, Union
import numpy as np
import pandas as pd

logger = logging.getLogger("sundarban.ml.features")

# Authoritative feature list extracted from Sentinel-2 & spectral indices
LAND_COVER_FEATURES: List[str] = [
    "B2",
    "B3",
    "B4",
    "B8",
    "B11",
    "B12",
    "NDVI",
    "NDWI",
]

# Explicit blacklist of target/metadata fields to prevent data leakage
FORBIDDEN_METADATA_FIELDS: set = {
    "classId",
    "class_id",
    "className",
    "class_name",
    "target",
    "label",
    "geometry",
    "coordinates",
    "villageId",
    "village_id",
    "year",
    "sector",
    "source",
    "dataSource",
    "data_source",
    "isRealData",
    "is_real_data",
}


class FeatureValidationError(ValueError):
    """Raised when feature matrix contains invalid values or missing columns."""
    pass


def validate_feature_dict(sample_dict: Dict[str, Any]) -> List[float]:
    """Extract and validate the 8-dimensional feature vector from a dictionary."""
    feature_vector: List[float] = []

    for feat in LAND_COVER_FEATURES:
        if feat not in sample_dict:
            raise FeatureValidationError(f"Missing required feature '{feat}' in sample: {list(sample_dict.keys())}")

        val = sample_dict[feat]
        try:
            val_f = float(val)
        except (ValueError, TypeError) as e:
            raise FeatureValidationError(f"Feature '{feat}' has non-numeric value: {val}") from e

        if np.isnan(val_f) or np.isinf(val_f):
            raise FeatureValidationError(f"Feature '{feat}' has invalid float value: {val_f}")

        feature_vector.append(val_f)

    return feature_vector


def validate_feature_matrix(
    X: Union[np.ndarray, pd.DataFrame, Sequence[Sequence[float]]],
    feature_names: Optional[Sequence[str]] = None,
) -> np.ndarray:
    """Validate 2D feature matrix ensuring correct dimensions, finite values, and no leakage."""
    if isinstance(X, pd.DataFrame):
        # Check for forbidden columns (data leakage protection)
        leaked_cols = set(X.columns).intersection(FORBIDDEN_METADATA_FIELDS)
        if leaked_cols:
            raise FeatureValidationError(
                f"Data leakage detected! Forbidden columns present in feature matrix: {leaked_cols}"
            )

        # Check required features
        missing_feats = [f for f in LAND_COVER_FEATURES if f not in X.columns]
        if missing_feats:
            raise FeatureValidationError(f"Missing required features in DataFrame: {missing_feats}")

        # Order columns strictly by LAND_COVER_FEATURES
        X_mat = X[LAND_COVER_FEATURES].to_numpy(dtype=np.float64)
    else:
        X_mat = np.asarray(X, dtype=np.float64)

    if X_mat.ndim != 2:
        raise FeatureValidationError(f"Expected 2D feature matrix, got shape {X_mat.shape}")

    if X_mat.shape[1] != len(LAND_COVER_FEATURES):
        raise FeatureValidationError(
            f"Expected {len(LAND_COVER_FEATURES)} features {LAND_COVER_FEATURES}, but matrix has {X_mat.shape[1]} columns."
        )

    if np.isnan(X_mat).any():
        raise FeatureValidationError("Feature matrix contains NaN values. Impute or filter before training.")

    if np.isinf(X_mat).any():
        raise FeatureValidationError("Feature matrix contains infinite values.")

    return X_mat
