"""API routes package."""
from .health import router as health_router
from .overview import router as overview_router
from .villages import router as villages_router
from .monitoring import router as monitoring_router
from .land_cover import router as land_cover_router
from .change_detection import router as change_detection_router
from .timeseries import router as timeseries_router
from .carbon import router as carbon_router
from .reports import router as reports_router
from .data_sources import router as data_sources_router

__all__ = [
    "health_router",
    "overview_router",
    "villages_router",
    "monitoring_router",
    "land_cover_router",
    "change_detection_router",
    "timeseries_router",
    "carbon_router",
    "reports_router",
    "data_sources_router",
]
