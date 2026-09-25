"""Overview metrics schemas."""
from typing import Optional
from .common import CamelModel


class OverviewMetrics(CamelModel):
    """Top-level dashboard overview KPI metrics."""
    pilot_area_ha: float
    observation_period: str
    estimated_carbon_tons: float
    active_alerts_count: int
    mangrove_health_index: int  # 0 - 100
    last_satellite_sync: str
    village_id: Optional[str] = None
