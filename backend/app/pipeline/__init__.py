"""GEE-side Random Forest mangrove mapping pipeline.

Layout:
- metrics.py   pure-Python maths (confusion matrix, areas, change) — unit tested
- gee_steps.py thin Earth Engine wrappers (composite, labels, training, sampling)
- runner.py    orchestration: train → test → predict → summarise → save JSON

The runner needs live Earth Engine credentials; everything in metrics.py does not.
"""
from .metrics import (
    BINARY_CLASSES,
    MANGROVE,
    NON_MANGROVE,
    build_model_version,
    metrics_from_confusion_matrix,
    areas_from_grouped_sum,
    min_mapping_unit_pixels,
    summarise_change,
)
from .runner import PipelineConfig, run_pipeline, save_result, load_latest_result

__all__ = [
    "BINARY_CLASSES",
    "MANGROVE",
    "NON_MANGROVE",
    "build_model_version",
    "metrics_from_confusion_matrix",
    "areas_from_grouped_sum",
    "min_mapping_unit_pixels",
    "summarise_change",
    "PipelineConfig",
    "run_pipeline",
    "save_result",
    "load_latest_result",
]
