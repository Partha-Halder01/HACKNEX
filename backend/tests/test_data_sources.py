"""Tests for data sources endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_data_sources():
    response = client.get("/api/data-sources")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    sentinel = next((s for s in data if s["id"] == "sentinel-2"), None)
    assert sentinel is not None
    assert sentinel["provider"] == "European Space Agency (ESA)"
    assert sentinel["status"] == "online"
    assert "bands" in sentinel
    assert len(sentinel["bands"]) >= 6

    gee = next((s for s in data if s["id"] == "gee-engine"), None)
    assert gee is not None
    assert gee["status"] == "planned"
