"""Unit and integration tests for bilingual report and PDF generation (Phase 7)."""
import os
import pytest
from fastapi.testclient import TestClient
from jinja2 import Environment, FileSystemLoader
from app.main import app
from app.services.reports import get_village_report
from app.services.pdf import generate_village_report_pdf

client = TestClient(app)


# =====================================================================
# 1. BILINGUAL VILLAGE REPORT SERVICE TESTS
# =====================================================================

@pytest.mark.anyio
async def test_get_village_report_bengali():
    """Verify get_village_report returns valid Bengali VillageReport."""
    rep = await get_village_report("gosaba", lang="bn")

    assert rep.village_id == "gosaba"
    assert rep.language == "bn"
    assert rep.bengali_village_name == "গোসাবা"
    assert rep.land_cover_findings.mangrove_area_ha > 0
    assert rep.change_findings.net_change_ha > 0
    assert rep.carbon_estimate.estimated_tons > 0
    assert len(rep.key_observations) >= 2
    assert len(rep.recommended_actions) >= 2


@pytest.mark.anyio
async def test_get_village_report_english():
    """Verify get_village_report returns valid English VillageReport."""
    rep = await get_village_report("gosaba", lang="en")

    assert rep.village_id == "gosaba"
    assert rep.language == "en"
    assert rep.village_name == "Gosaba"
    assert "Gosaba" in rep.summary_text
    assert len(rep.key_observations) >= 2
    assert len(rep.recommended_actions) >= 2


# =====================================================================
# 2. JINJA2 TEMPLATE RENDERING TESTS
# =====================================================================

@pytest.mark.anyio
async def test_jinja2_template_rendering():
    """Verify Jinja2 HTML templates render cleanly without syntax errors."""
    template_dir = os.path.join(os.path.dirname(__file__), "..", "app", "templates")
    env = Environment(loader=FileSystemLoader(template_dir))

    rep_bn = await get_village_report("gosaba", lang="bn")
    rep_dict_bn = rep_bn.model_dump(by_alias=False)

    template_bn = env.get_template("village_report_bn.html")
    html_bn = template_bn.render(report=rep_dict_bn)
    assert "গোসাবা" in html_bn
    assert "SUNDARBAN BLUE CARBON" in html_bn

    rep_en = await get_village_report("gosaba", lang="en")
    rep_dict_en = rep_en.model_dump(by_alias=False)

    template_en = env.get_template("village_report_en.html")
    html_en = template_en.render(report=rep_dict_en)
    assert "Gosaba" in html_en
    assert "Executive Summary" in html_en


# =====================================================================
# 3. REPORTLAB PDF GENERATION TESTS
# =====================================================================

@pytest.mark.anyio
async def test_pdf_generation_bytes():
    """Verify ReportLab produces valid non-empty PDF binary."""
    rep = await get_village_report("gosaba", lang="en")
    pdf_bytes = generate_village_report_pdf(report=rep.model_dump(by_alias=False), language="en")

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")


# =====================================================================
# 4. FASTAPI REPORT ENDPOINT INTEGRATION TESTS
# =====================================================================

def test_api_village_report_json():
    """Verify GET /api/villages/{id}/reports returns 200 with VillageReport model."""
    res_bn = client.get("/api/villages/gosaba/reports?lang=bn")
    assert res_bn.status_code == 200
    data_bn = res_bn.json()
    assert data_bn["villageId"] == "gosaba"
    assert data_bn["language"] == "bn"
    assert "landCoverFindings" in data_bn
    assert "changeFindings" in data_bn
    assert "carbonEstimate" in data_bn

    res_en = client.get("/api/villages/gosaba/reports?lang=en")
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["villageId"] == "gosaba"
    assert data_en["language"] == "en"


def test_api_village_report_pdf_export():
    """Verify GET /api/villages/{id}/reports/pdf streams binary PDF."""
    res_pdf = client.get("/api/villages/gosaba/reports/pdf?lang=en")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert "attachment" in res_pdf.headers.get("content-disposition", "")
    assert res_pdf.content.startswith(b"%PDF-")
