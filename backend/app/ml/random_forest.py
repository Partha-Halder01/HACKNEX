"""Random Forest classifier creation, training, serialization, and artifact management."""
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from .features import validate_feature_matrix
from .labels import LAND_COVER_CLASSES

logger = logging.getLogger("sundarban.ml.random_forest")

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"


def create_random_forest_model(
    n_estimators: int = 200,
    random_state: int = 42,
    max_depth: Optional[int] = None,
    min_samples_split: int = 2,
    min_samples_leaf: int = 1,
    class_weight: str = "balanced",
    n_jobs: int = -1,
) -> RandomForestClassifier:
    """Instantiate a reproducible scikit-learn RandomForestClassifier."""
    return RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=random_state,
        max_depth=max_depth,
        min_samples_split=min_samples_split,
        min_samples_leaf=min_samples_leaf,
        class_weight=class_weight,
        n_jobs=n_jobs,
    )


def train_random_forest(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 200,
    random_state: int = 42,
    class_weight: str = "balanced",
) -> RandomForestClassifier:
    """Train Random Forest classifier on validated feature matrix."""
    X_mat = validate_feature_matrix(X_train)
    y_vec = np.asarray(y_train, dtype=np.int64)

    if X_mat.shape[0] != y_vec.shape[0]:
        raise ValueError(f"Shape mismatch: X has {X_mat.shape[0]} rows, y has {y_vec.shape[0]} labels.")

    logger.info(
        f"[RandomForest] Training classifier with {X_mat.shape[0]} samples, {X_mat.shape[1]} features, "
        f"n_estimators={n_estimators}, class_weight={class_weight}."
    )

    model = create_random_forest_model(
        n_estimators=n_estimators,
        random_state=random_state,
        class_weight=class_weight,
    )
    model.fit(X_mat, y_vec)
    return model


def save_model_artifact(
    model: RandomForestClassifier,
    metadata: Dict[str, Any],
    model_dir: Optional[Union[str, Path]] = None,
    model_name: str = "random_forest_v1",
) -> Tuple[Path, Path]:
    """Serialize model artifact to .joblib and metadata to .json."""
    out_dir = Path(model_dir or DEFAULT_MODEL_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)

    joblib_path = out_dir / f"{model_name}.joblib"
    json_path = out_dir / f"{model_name}.json"

    # Save joblib binary
    joblib.dump(model, joblib_path)
    logger.info(f"[RandomForest] Saved model artifact to: {joblib_path}")

    # Save metadata JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"[RandomForest] Saved model metadata to: {json_path}")

    return joblib_path, json_path


def load_model_artifact(
    model_dir: Optional[Union[str, Path]] = None,
    model_name: str = "random_forest_v1",
) -> Tuple[RandomForestClassifier, Dict[str, Any]]:
    """Load trained RandomForestClassifier and its metadata JSON."""
    in_dir = Path(model_dir or DEFAULT_MODEL_DIR)
    joblib_path = in_dir / f"{model_name}.joblib"
    json_path = in_dir / f"{model_name}.json"

    if not joblib_path.exists():
        raise FileNotFoundError(f"Model binary artifact not found at: {joblib_path}")
    if not json_path.exists():
        raise FileNotFoundError(f"Model metadata JSON not found at: {json_path}")

    model: RandomForestClassifier = joblib.load(joblib_path)
    with open(json_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    return model, metadata
