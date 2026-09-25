"""Spatial & Environmental Monitoring schemas."""
from typing import List, Optional, Literal
from .common import CamelModel

LandCoverClass = Literal[
    "Mangrove",
    "Water",
    "Aquaculture",
    "Bare Land",
    "Other Vegetation",
]


class LandCoverItem(CamelModel):
    label: LandCoverClass
    value: float  # Percentage (0 - 100)
    area_ha: float  # Area in hectares
    color: str  # Hex color code
    confidence: Optional[float] = None  # 0 - 100


class LandCoverDistribution(CamelModel):
    village_id: str
    year: int
    total_area_ha: float
    distribution: List[LandCoverItem]


class LandCoverPolygon(CamelModel):
    id: str
    name: str
    category: LandCoverClass
    color: str
    fill_color: str
    coordinates: List[List[float]]  # List of [lat, lng] pairs
    area_ha: float
    health_index: Optional[float] = None  # NDVI indicator (0 - 1)


class Village(CamelModel):
    id: str
    name: str
    bengali_name: str
    coordinates: List[float]  # [lat, lng]
    pilot_area_ha: float
    description: str
    mangrove_cover_percentage: Optional[float] = None


class SpatialMonitoringData(CamelModel):
    village_id: str
    village_name: str
    year: int
    total_area_ha: float
    mangrove_area_ha: float
    water_area_ha: float
    aquaculture_area_ha: float
    bare_land_area_ha: float
    other_veg_area_ha: float
    polygons: List[LandCoverPolygon]
    satellite_source: str
    acquisition_date: str


class LandCoverSummary(CamelModel):
    village_id: str
    year: int
    total_monitored_ha: float
    canopy_density_score: float  # 0 - 100
    dominant_class: LandCoverClass
