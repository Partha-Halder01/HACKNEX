"""Tests for bilingual village reports and PDF export endpoints."""
from fastapi.testclient import TestClient
from app.main import app
from app.services.pdf import generate_village_report_pdf
from app.data.demo_data import DEMO_REPORTS

client = TestClient(app)


def test_reports_bengali():
    response = client.get("/api/villages/gosaba/reports?lang=bn")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "gosaba"
    assert data["language"] == "bn"
    assert "summaryText" in data
    assert "landCoverFindings" in data
    assert "changeFindings" in data
    assert "carbonEstimate" in data
    assert "keyObservations" in data
    assert "recommendedActions" in data
    assert len(data["recommendedActions"]) > 0


def test_reports_english():
    response = client.get("/api/villages/gosaba/reports?lang=en")
    assert response.status_code == 200
    data = response.json()
    assert data["villageId"] == "gosaba"
    assert data["language"] == "en"
    assert "summaryText" in data
    assert "Gosaba" in data["summaryText"]


def test_reports_invalid_lang():
    response = client.get("/api/villages/gosaba/reports?lang=fr")
    assert response.status_code == 422


def test_reports_unknown_village():
    response = client.get("/api/villages/nonexistent_village/reports?lang=bn")
    assert response.status_code == 404


def test_pdf_export_bengali():
    response = client.get("/api/villages/gosaba/reports/pdf?lang=bn")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response.headers.get("content-disposition", "")
    assert len(response.content) > 1000  # Valid PDF size


def test_pdf_export_english():
    response = client.get("/api/villages/gosaba/reports/pdf?lang=en")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000


def test_standalone_pdf_generator():
    report_dict = DEMO_REPORTS["gosaba"]["en"]
    pdf_bytes = generate_village_report_pdf(report=report_dict, language="en")
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
