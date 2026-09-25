"""Change detection and transition matrix Pydantic schemas (Phase 5)."""
from typing import Any, Dict, List, Literal, Optional
from .common import CamelModel, GeoJsonGeometry

# Legacy & canonical categories
ChangeCategory = Literal[
    "Mangrove Gain",
    "Mangrove Loss",
    "Water Change",
    "Aquaculture Expansion",
    "Mangrove → Aquaculture Transition",
    "Mangrove -> Aquaculture Transition",
    "Bare Land Change",
    "Other Vegetation Change",
    "STABLE",
    "MANGROVE_LOSS",
    "MANGROVE_GAIN",
    "CLASS_CONVERSION",
    "LOW_CONFIDENCE_CHANGE",
]

AlertSeverity = Literal["high", "medium", "low", "positive"]


class EnvironmentalAlert(CamelModel):
    """Environmental alert for shoreline/canopy disturbance."""
    id: str
    severity: AlertSeverity
    color: str
    title: str
    location: str
    date: str
    description: Optional[str] = None
    affected_area_ha: Optional[float] = None


class ChangeMetric(CamelModel):
    """Summarized change metric item for dashboard KPIs."""
    category: str
    area_ha: float
    percentage_change: float
    trend: Literal["gain", "loss", "neutral"]


class TimeSeriesPoint(CamelModel):
    """Multi-year historical time-series observation point."""
    year: str
    area_ha: float
    gain_ha: float
    loss_ha: float
    carbon_stock: float  # Estimated metric tons CO2e


class TimeSeriesData(CamelModel):
    """Historical time-series dataset."""
    village_id: str
    data: List[TimeSeriesPoint]


# =====================================================================
# PHASE 5 DETAILED TRANSITION & CONFIDENCE SCHEMAS
# =====================================================================

class TransitionMatrixCell(CamelModel):
    """Single transition cell in the 5x5 matrix."""
    from_class_id: int
    from_class_name: str
    to_class_id: int
    to_class_name: str
    transition: str
    cell_count: int
    area_ha: float
    percentage_of_source: float
    percentage_of_aoi: float
    change_category: str


class TransitionMatrix(CamelModel):
    """Complete 5x5 land-cover transition matrix."""
    classes: List[str]
    matrix: List[List[int]]  # 5x5 cell counts
    area_matrix_ha: List[List[float]]  # 5x5 area in hectares
    transitions: List[TransitionMatrixCell]  # All 25 transition records


class MangroveLossBreakdown(CamelModel):
    """Breakdown of gross mangrove loss by destination class."""
    to_water_ha: float
    to_aquaculture_ha: float
    to_bare_land_ha: float
    to_other_veg_ha: float
    total_loss_ha: float


class MangroveGainBreakdown(CamelModel):
    """Breakdown of gross mangrove gain by origin class."""
    from_water_ha: float
    from_aquaculture_ha: float
    from_bare_land_ha: float
    from_other_veg_ha: float
    total_gain_ha: float


class MangroveChangeSummary(CamelModel):
    """Core mangrove dynamic change summary."""
    baseline_year: int
    comparison_year: int
    baseline_mangrove_ha: float
    comparison_mangrove_ha: float
    gross_gain_ha: float
    gross_loss_ha: float
    net_change_ha: float
    percent_change: Optional[float] = None
    stable_mangrove_ha: float
    loss_breakdown: MangroveLossBreakdown
    gain_breakdown: MangroveGainBreakdown


class ConfidenceSummary(CamelModel):
    """Change detection confidence proxy and low-confidence flags."""
    mean_confidence_2020: float
    mean_confidence_2025: float
    mean_change_confidence: float
    confidence_threshold: float
    low_confidence_change_cells: int
    low_confidence_change_area_ha: float
    confidence_score: float  # 0 - 100 for backward compatibility


class ChangeDetectionModelMetadata(CamelModel):
    """Classifier and processing metadata for temporal consistency validation."""
    model_name: str = "RandomForestClassifier"
    model_version: str = "rf-v1"
    feature_version: str = "sentinel2-v1"
    cell_size_meters: int = 20
    cell_area_ha: float = 0.04
    seasonal_window: str = "Jan 01 - Mar 31"
    collection_id: str = "COPERNICUS/S2_SR_HARMONIZED"


class ChangeDetectionResult(CamelModel):
    """Full change detection payload supporting both legacy and Phase 5 contracts."""
    village_id: str
    village_name: Optional[str] = None
    from_year: int
    to_year: int
    gain_ha: float
    loss_ha: float
    net_change_ha: float
    confidence_score: float  # 0 - 100
    mangrove_summary: Optional[MangroveChangeSummary] = None
    confidence_summary: Optional[ConfidenceSummary] = None
    transition_matrix: Optional[TransitionMatrix] = None
    stable_areas_ha: Optional[Dict[str, float]] = None
    metrics: List[ChangeMetric] = []
    alerts: List[EnvironmentalAlert] = []
    model: Optional[ChangeDetectionModelMetadata] = None
    data_source: Literal["random_forest_gee", "demo_fallback"] = "demo_fallback"
    is_real_data: bool = False


# Alias for explicit naming
ChangeDetectionResponse = ChangeDetectionResult


class ChangePreviewFeature(CamelModel):
    """GeoJSON Feature representing a transition zone polygon."""
    type: Literal["Feature"] = "Feature"
    id: Optional[str] = None
    properties: Dict[str, Any]
    geometry: GeoJsonGeometry


class ChangePreviewFeatureCollection(CamelModel):
    """GeoJSON FeatureCollection for map-ready change visualization."""
    type: Literal["FeatureCollection"] = "FeatureCollection"
    name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    features: List[ChangePreviewFeature]


class ChangeDetectionPreviewResponse(CamelModel):
    """Map-ready GeoJSON preview response for Leaflet overlay."""
    village_id: str
    village_name: str
    from_year: int
    to_year: int
    data_source: Literal["random_forest_gee", "demo_fallback"]
    is_real_data: bool
    model_version: str = "rf-v1"
    total_area_ha: float
    geojson: ChangePreviewFeatureCollection
