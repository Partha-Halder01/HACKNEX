"""Tests for villages endpoint."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_villages_list():
    response = client.get("/api/villages")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

    # Verify Gosaba item structure
    gosaba = next((v for v in data if v["id"] == "gosaba"), None)
    assert gosaba is not None
    assert gosaba["name"] == "Gosaba"
    assert "bengaliName" in gosaba
    assert len(gosaba["coordinates"]) == 2
    assert gosaba["pilotAreaHa"] > 0
