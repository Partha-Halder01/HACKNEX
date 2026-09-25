"""Health check route."""
from fastapi import APIRouter
from ...schemas.common import HealthResponse
from ...core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Check backend operational health."""
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME.lower().replace(" ", "-"),
        version=settings.APP_VERSION,
    )
