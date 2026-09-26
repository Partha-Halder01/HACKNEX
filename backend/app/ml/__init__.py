"""Machine Learning package for MangroveLens."""
from .labels import (
    LAND_COVER_CLASSES,
    CLASS_NAMES,
    CLASS_DEFINITIONS,
    get_class_name,
    get_class_id,
    validate_class_id,
)
from .features import (
    LAND_COVER_FEATURES,
    validate_feature_dict,
    validate_feature_matrix,
    FeatureValidationError,
)
from .dataset import (
    load_training_geojson,
    build_training_dataset,
    split_training_data,
)
from .random_forest import (
    create_random_forest_model,
    train_random_forest,
    save_model_artifact,
    load_model_artifact,
)
from .validation import evaluate_classifier
from .prediction import (
    predict_sample,
    predict_batch,
    calculate_class_areas_and_distribution,
)
from .model_registry import (
    get_model,
    register_model_in_memory,
    get_model_status,
)
from .change_detection import (
    CELL_SIZE_METERS,
    CELL_AREA_HECTARES,
    DEFAULT_CONFIDENCE_THRESHOLD,
    DEFAULT_SEASONAL_WINDOW,
    CHANGE_CATEGORY_STABLE,
    CHANGE_CATEGORY_MANGROVE_LOSS,
    CHANGE_CATEGORY_MANGROVE_GAIN,
    CHANGE_CATEGORY_CLASS_CONVERSION,
    CHANGE_CATEGORY_LOW_CONFIDENCE,
    SpatialCoverageMismatchError,
    IncompatibleModelVersionError,
    InvalidTemporalComparisonError,
    validate_temporal_consistency,
    validate_model_compatibility,
    categorize_transition,
    compute_transition_matrix,
)

__all__ = [
    "LAND_COVER_CLASSES",
    "CLASS_NAMES",
    "CLASS_DEFINITIONS",
    "get_class_name",
    "get_class_id",
    "validate_class_id",
    "LAND_COVER_FEATURES",
    "validate_feature_dict",
    "validate_feature_matrix",
    "FeatureValidationError",
    "load_training_geojson",
    "build_training_dataset",
    "split_training_data",
    "create_random_forest_model",
    "train_random_forest",
    "save_model_artifact",
    "load_model_artifact",
    "evaluate_classifier",
    "predict_sample",
    "predict_batch",
    "calculate_class_areas_and_distribution",
    "get_model",
    "register_model_in_memory",
    "get_model_status",
    "CELL_SIZE_METERS",
    "CELL_AREA_HECTARES",
    "DEFAULT_CONFIDENCE_THRESHOLD",
    "DEFAULT_SEASONAL_WINDOW",
    "CHANGE_CATEGORY_STABLE",
    "CHANGE_CATEGORY_MANGROVE_LOSS",
    "CHANGE_CATEGORY_MANGROVE_GAIN",
    "CHANGE_CATEGORY_CLASS_CONVERSION",
    "CHANGE_CATEGORY_LOW_CONFIDENCE",
    "SpatialCoverageMismatchError",
    "IncompatibleModelVersionError",
    "InvalidTemporalComparisonError",
    "validate_temporal_consistency",
    "validate_model_compatibility",
    "categorize_transition",
    "compute_transition_matrix",
]
