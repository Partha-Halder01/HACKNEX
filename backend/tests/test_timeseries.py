"""Tests for timeseries endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_timeseries_gosaba():
    response = client.get("/api/timeseries?village_id=gosaba")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "gosaba"
    assert "data" in data
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 5

    first_point = data["data"][0]
    assert "year" in first_point
    assert "areaHa" in first_point
    assert "carbonStock" in first_point


def test_timeseries_missing_param():
    response = client.get("/api/timeseries")
    assert response.status_code == 422


def test_timeseries_unknown_village():
    response = client.get("/api/timeseries?village_id=unknown_sector")
    assert response.status_code == 404
