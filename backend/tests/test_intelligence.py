"""Unit and integration tests for Phase 7 AI Environmental Intelligence & Guardrails."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.intelligence.evidence import build_environmental_evidence
from app.intelligence.validator import validate_ai_insights
from app.intelligence.insights import generate_deterministic_fallback_insights
from app.data.evidence_rules import check_forbidden_claims

client = TestClient(app)


# =====================================================================
# 1. EVIDENCE BUILDER & FACT GENERATION TESTS
# =====================================================================

@pytest.mark.anyio
async def test_evidence_builder_completeness():
    """Verify evidence builder produces valid atomic items and deterministic facts."""
    evidence_items, facts, raw = await build_environmental_evidence("gosaba", year=2025, from_year=2020, to_year=2025)

    assert len(evidence_items) >= 10
    assert len(facts) >= 5
    assert "land_cover" in raw
    assert "change_detection" in raw
    assert "carbon" in raw

    evidence_ids = [e.evidence_id for e in evidence_items]
    assert any("LC-2025-GOSABA" in eid for eid in evidence_ids)
    assert any("CD-2020-2025-GOSABA" in eid for eid in evidence_ids)
    assert any("CARB-2025-GOSABA" in eid for eid in evidence_ids)
    assert any("UNC-2025-GOSABA" in eid for eid in evidence_ids)

    for item in evidence_items:
        assert item.evidence_id
        assert item.category in ["land_cover", "change_detection", "carbon", "uncertainty", "geospatial", "methodology", "data_quality"]
        assert item.source
        assert item.metric
        assert item.time_period
        assert item.methodology

    for fact in facts:
        assert fact.fact_id
        assert fact.statement_en
        assert fact.statement_bn
        assert fact.evidence_id in evidence_ids


# =====================================================================
# 2. GUARDRAIL & FORBIDDEN CLAIM VALIDATION TESTS
# =====================================================================

def test_forbidden_claim_detection():
    """Verify detection of forbidden/unverified carbon or causal claims."""
    clean_text = "The estimated mangrove area changed by +25.0 ha with model-based carbon stock calculation."
    assert len(check_forbidden_claims(clean_text)) == 0

    bad_texts = [
        "This project produces verified carbon credits for voluntary carbon trading.",
        "Satellite directly measured carbon stocks across the delta.",
        "The project ensures guaranteed revenue of $100,000.",
        "Confirmed coastal erosion event caused the mangrove loss.",
        "Confirmed encroachment from illegal shrimp ponds destroyed the forest.",
        "Guaranteed atmospheric removal of 25,000 tons of CO2.",
    ]

    for bad in bad_texts:
        found = check_forbidden_claims(bad)
        assert len(found) > 0, f"Failed to detect forbidden claim in: '{bad}'"


@pytest.mark.anyio
async def test_guardrail_validator_rejects_hallucinated_evidence_ids():
    """Verify validator flags any fabricated evidence ID citations."""
    evidence_items, _, _ = await build_environmental_evidence("gosaba", year=2025)

    valid_payload = {
        "executiveSummary": "Gosaba mangrove canopy is stable.",
        "landCoverSummary": "Core mangrove forest covers 62% of pilot area.",
        "changeSummary": "Spectral transitions show net canopy increase.",
        "carbonSummary": "Tier-1 literature factor applied.",
        "uncertaintySummary": "Propagated uncertainty is ±18.3%.",
        "limitations": ["Optical 20m resolution proxy."],
        "evidenceReferences": [evidence_items[0].evidence_id],
    }

    is_valid, issues, _ = validate_ai_insights(valid_payload, evidence_items)
    assert is_valid is True
    assert len(issues) == 0

    # Introduce fake evidence ID
    invalid_payload = dict(valid_payload)
    invalid_payload["evidenceReferences"] = ["FABRICATED-EVIDENCE-ID-999"]

    is_valid_fake, issues_fake, _ = validate_ai_insights(invalid_payload, evidence_items)
    assert is_valid_fake is False
    assert any("invalid or fabricated Evidence IDs" in s for s in issues_fake)


# =====================================================================
# 3. DETERMINISTIC FALLBACK INSIGHTS TESTS
# =====================================================================

@pytest.mark.anyio
async def test_deterministic_fallback_insights_bilingual():
    """Verify fallback insights produce non-empty, evidence-grounded English and Bengali reports."""
    evidence_items, facts, _ = await build_environmental_evidence("gosaba", year=2025)

    insights_en = generate_deterministic_fallback_insights(
        village_name="Gosaba",
        bengali_village_name="গোসাবা",
        year=2025,
        from_year=2020,
        to_year=2025,
        evidence_items=evidence_items,
        deterministic_facts=facts,
        language="en",
    )
    assert "Gosaba" in insights_en.executive_summary
    assert len(insights_en.limitations) >= 3
    assert len(insights_en.evidence_references) >= 5

    insights_bn = generate_deterministic_fallback_insights(
        village_name="Gosaba",
        bengali_village_name="গোসাবা",
        year=2025,
        from_year=2020,
        to_year=2025,
        evidence_items=evidence_items,
        deterministic_facts=facts,
        language="bn",
    )
    assert "গোসাবা" in insights_bn.executive_summary
    assert len(insights_bn.limitations) >= 3


# =====================================================================
# 4. FASTAPI INTELLIGENCE ROUTE INTEGRATION TESTS
# =====================================================================

def test_api_intelligence_main_endpoint():
    """Verify GET /api/intelligence returns full structured intelligence."""
    res = client.get("/api/intelligence?village_id=gosaba&year=2025&from_year=2020&to_year=2025&lang=en")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert data["year"] == 2025
    assert "insights" in data
    assert "confidence" in data
    assert "verification" in data
    assert "managementConsiderations" in data
    assert "evidenceItems" in data
    assert "aiMetadata" in data
    assert len(data["evidenceItems"]) >= 10


def test_api_intelligence_summary_endpoint():
    """Verify GET /api/intelligence/summary returns quick metrics and flags."""
    res = client.get("/api/intelligence/summary?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert "executiveSummary" in data
    assert data["mangroveAreaHa"] > 0
    assert "systemQualityIndicator" in data


def test_api_intelligence_verification_endpoint():
    """Verify GET /api/intelligence/verification returns field survey flags."""
    res = client.get("/api/intelligence/verification?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert "verification" in data
    assert "priority" in data["verification"]
    assert "reasonCodes" in data["verification"]


def test_api_intelligence_evidence_endpoint():
    """Verify GET /api/intelligence/evidence returns atomic evidence items."""
    res = client.get("/api/intelligence/evidence?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert data["evidenceCount"] >= 10
    assert len(data["evidenceItems"]) == data["evidenceCount"]


def test_api_intelligence_validation_errors():
    """Verify 422 on missing village and 400 on invalid period."""
    res_no_village = client.get("/api/intelligence")
    assert res_no_village.status_code == 422

    res_bad_period = client.get("/api/intelligence?village_id=gosaba&from_year=2025&to_year=2020")
    assert res_bad_period.status_code == 400
