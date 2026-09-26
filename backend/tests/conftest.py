"""Keep the test suite offline and deterministic, whatever backend/.env contains."""
import pytest

from app.core.config import settings
from app.geospatial import gee_client


@pytest.fixture(autouse=True)
def _no_live_services(monkeypatch):
    monkeypatch.setattr(settings, "GEE_ENABLED", False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "WARMUP_ON_START", False)
    monkeypatch.setattr(gee_client, "_gee_initialized", False)
    yield
