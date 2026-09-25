"""Schemas for Land Cover Classification, Model Status, and Validation Metrics."""
from typing import Any, Dict, List, Literal, Optional
from .common import CamelModel, GeoJsonGeometry

LandCoverClass = Literal[
    "Mangrove",
    "Water",
    "Aquaculture",
    "Bare Land",
    "Other Vegetation",
]


class LandCoverItem(CamelModel):
    """Single classified land-cover class distribution item."""
    label: LandCoverClass
    value: float  # Percentage (0 - 100)
    area_ha: float  # Area in hectares
    color: str  # Hex color code
    confidence: Optional[float] = None  # 0 - 100 or 0 - 1
    uncertainty_proxy: Optional[float] = None
    class_id: Optional[int] = None
    pixel_count: Optional[int] = None


class LandCoverDistribution(CamelModel):
    """Multi-class land cover distribution payload (compatible with Phase 2 & Phase 4)."""
    village_id: str
    village_name: Optional[str] = None
    year: int
    total_area_ha: float
    distribution: List[LandCoverItem]
    model_name: str = "RandomForestClassifier"
    model_version: str = "rf-v1"
    feature_version: str = "sentinel2-v1"
    data_source: Literal["random_forest_gee", "demo_fallback"] = "demo_fallback"
    is_real_data: bool = False
    class_areas: Optional[Dict[str, float]] = None


class ClassMetricDetail(CamelModel):
    """Per-class validation metrics."""
    precision: float
    recall: float
    f1: float
    support: int


class ConfusionMatrixData(CamelModel):
    """5x5 Confusion Matrix data structure."""
    classes: List[str]
    matrix: List[List[int]]


class FeatureImportanceDetail(CamelModel):
    """Feature importance score for a spectral band or index."""
    feature: str
    importance: float


class ModelValidationMetrics(CamelModel):
    """Comprehensive validation report for the Random Forest model."""
    village_id: Optional[str] = None
    year: Optional[int] = None
    model_name: str = "RandomForestClassifier"
    model_version: str = "rf-v1"
    training_data_source: str = "pilot_demo"
    validation_status: str = "validated"
    sample_count: int
    overall_accuracy: float
    precision_macro: float
    recall_macro: float
    f1_macro: float
    f1_weighted: float
    confusion_matrix: ConfusionMatrixData
    class_metrics: Dict[str, ClassMetricDetail]
    feature_importances: List[FeatureImportanceDetail]
    disclaimer: str = (
        "Validation metrics reflect the training/validation partition of the pilot dataset. "
        "Production accuracy requires authoritative ground-truth reference data."
    )


class ModelStatusResponse(CamelModel):
    """Operational status and metadata of the active classifier."""
    loaded: bool
    model_name: str = "RandomForestClassifier"
    model_version: str = "rf-v1"
    feature_version: str = "sentinel2-v1"
    training_data_source: str = "pilot_demo"
    trained_at: Optional[str] = None
    feature_count: int = 8
    class_count: int = 5
    n_estimators: Optional[int] = 200
    overall_accuracy: Optional[float] = None
    status_message: str


class LandCoverPreviewFeature(CamelModel):
    """GeoJSON Feature representing a classified land-cover zone or sample."""
    type: Literal["Feature"] = "Feature"
    id: Optional[str] = None
    properties: Dict[str, Any]
    geometry: GeoJsonGeometry


class LandCoverPreviewFeatureCollection(CamelModel):
    """GeoJSON FeatureCollection for classified land-cover preview."""
    type: Literal["FeatureCollection"] = "FeatureCollection"
    name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    features: List[LandCoverPreviewFeature]


class LandCoverPreviewResponse(CamelModel):
    """Map-ready GeoJSON FeatureCollection payload for Leaflet land-cover overlay."""
    village_id: str
    village_name: str
    year: int
    data_source: Literal["random_forest_gee", "demo_fallback"]
    is_real_data: bool
    model_version: str = "rf-v1"
    total_area_ha: float
    geojson: LandCoverPreviewFeatureCollection
