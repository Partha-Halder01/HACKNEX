"""Tests for spatial monitoring endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_monitoring_gosaba():
    response = client.get("/api/monitoring?village_id=gosaba&year=2025")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "gosaba"
    assert data["villageName"] == "Gosaba"
    assert data["year"] == 2025
    assert data["totalAreaHa"] == 1245.0
    assert "mangroveAreaHa" in data
    assert "polygons" in data
    assert isinstance(data["polygons"], list)
    assert len(data["polygons"]) > 0


def test_monitoring_camelcase_alias():
    response = client.get("/api/monitoring?villageId=satjelia&year=2025")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "satjelia"


def test_monitoring_missing_param():
    response = client.get("/api/monitoring")
    assert response.status_code == 422


def test_monitoring_unknown_village():
    response = client.get("/api/monitoring?village_id=nonexistent")
    assert response.status_code == 404
