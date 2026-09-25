"""Central API Router aggregation."""
from fastapi import APIRouter
from .routes.health import router as health_router
from .routes.overview import router as overview_router
from .routes.villages import router as villages_router
from .routes.monitoring import router as monitoring_router
from .routes.land_cover import router as land_cover_router
from .routes.change_detection import router as change_detection_router
from .routes.timeseries import router as timeseries_router
from .routes.carbon import router as carbon_router
from .routes.reports import router as reports_router
from .routes.data_sources import router as data_sources_router
from .routes.geospatial import router as geospatial_router
from .routes.intelligence import router as intelligence_router
from .routes.analysis import router as analysis_router

api_router = APIRouter()

# Register all routes under /api
api_router.include_router(health_router)
api_router.include_router(overview_router)
api_router.include_router(villages_router)
api_router.include_router(monitoring_router)
api_router.include_router(land_cover_router)
api_router.include_router(change_detection_router)
api_router.include_router(timeseries_router)
api_router.include_router(carbon_router)
api_router.include_router(reports_router)
api_router.include_router(data_sources_router)
api_router.include_router(geospatial_router)
api_router.include_router(intelligence_router)
api_router.include_router(analysis_router)

