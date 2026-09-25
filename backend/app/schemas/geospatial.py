"""Pydantic schemas for Sentinel-2, Google Earth Engine, and geospatial observations."""
from typing import Any, Dict, List, Literal, Optional
from .common import CamelModel, GeoJsonGeometry


class GeoStatistics(CamelModel):
    """Zonal spatial statistics calculated across an Area of Interest."""
    min: float
    max: float
    mean: float
    median: float
    std_dev: float


class SeasonalWindow(CamelModel):
    """Seasonal window months and days for consistent multi-year comparison."""
    start_month: int
    start_day: int
    end_month: int
    end_day: int


class GeospatialStatusResponse(CamelModel):
    """Status report of Google Earth Engine and geospatial pipeline."""
    enabled: bool
    initialized: bool
    status_code: str
    message: str
    project_id: Optional[str] = None
    collection_id: str
    aoi_source: str
    cloud_threshold_percent: int
    seasonal_window: SeasonalWindow


class ProcessingMetadata(CamelModel):
    """Metadata describing the Sentinel-2 query, cloud masking, and composite generation."""
    collection_id: str
    start_date: str
    end_date: str
    image_count: int
    cloud_threshold: int
    composite_method: str = "median"
    bands: List[str]
    indices: List[str]
    resolution_meters: int = 20


class SentinelObservation(CamelModel):
    """Structured Sentinel-2 observation document for a given village sector and year."""
    village_id: str
    village_name: str
    year: int
    source: str = "Sentinel-2"
    platform: str = "Google Earth Engine"
    collection: str = "COPERNICUS/S2_SR_HARMONIZED"
    data_source: Literal["sentinel2_gee", "demo_fallback"]
    is_real_data: bool
    geometry: GeoJsonGeometry
    bands: Dict[str, GeoStatistics]
    indices: Dict[str, GeoStatistics]
    processing: ProcessingMetadata


class IndexStatisticsDetail(CamelModel):
    """Detailed index statistics with formula and scientific interpretation."""
    name: str
    formula: str
    bands: Dict[str, str]
    range: List[float]
    statistics: GeoStatistics
    interpretation: str
    scientific_disclaimer: str


class GeospatialIndicesResponse(CamelModel):
    """Comprehensive NDVI and NDWI response with scientific context."""
    village_id: str
    village_name: str
    year: int
    data_source: Literal["sentinel2_gee", "demo_fallback"]
    is_real_data: bool
    ndvi: IndexStatisticsDetail
    ndwi: IndexStatisticsDetail


class GeoJSONFeature(CamelModel):
    """Standard GeoJSON Feature representation."""
    type: Literal["Feature"] = "Feature"
    id: Optional[str] = None
    properties: Dict[str, Any]
    geometry: GeoJsonGeometry


class GeoJSONFeatureCollection(CamelModel):
    """Standard GeoJSON FeatureCollection representation."""
    type: Literal["FeatureCollection"] = "FeatureCollection"
    name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    features: List[GeoJSONFeature]


class GeospatialPreviewResponse(CamelModel):
    """Map-ready GeoJSON FeatureCollection payload for frontend Leaflet layers."""
    village_id: str
    village_name: str
    year: int
    data_source: Literal["sentinel2_gee", "demo_fallback"]
    is_real_data: bool
    geojson: GeoJSONFeatureCollection
