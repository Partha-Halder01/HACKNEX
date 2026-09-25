"""Data Sources and Satellite Telemetry schemas."""
from typing import List, Optional, Dict, Any, Literal
from .common import CamelModel


class DataSourceBand(CamelModel):
    id: str
    name: str
    wavelength: str
    resolution: str
    purpose: str


class DataSource(CamelModel):
    id: str
    name: str
    provider: str
    type: Literal["Optical Satellite", "Radar / SAR", "Cloud Processing Engine"]
    status: Literal["online", "degraded", "offline", "planned", "demo"]
    last_updated: str
    description: str
    coverage: str
    spatial_resolution: str
    revisit_days: int
    bands: Optional[List[DataSourceBand]] = None
    metadata: Optional[Dict[str, Any]] = None
