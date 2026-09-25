"""Tests for overview endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_overview_default():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "pilotAreaHa" in data
    assert "estimatedCarbonTons" in data
    assert "observationPeriod" in data
    assert "activeAlertsCount" in data
    assert "mangroveHealthIndex" in data
    assert data["pilotAreaHa"] > 0


def test_overview_with_village_filter():
    response = client.get("/api/overview?village_id=satjelia")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "satjelia"
    assert data["pilotAreaHa"] == 980.0
