"""Unit tests for Phase 7 Confidence Matrix and Decision Support Recommendations."""
import pytest
from app.intelligence.confidence import evaluate_confidence_status, build_component_confidence_matrix
from app.intelligence.recommendations import evaluate_field_verification_priority, generate_management_considerations
from app.intelligence.evidence import build_environmental_evidence


def test_evaluate_confidence_status_bands():
    """Verify confidence score qualitative categorization bands."""
    assert evaluate_confidence_status(0.95) == "high"
    assert evaluate_confidence_status(0.85) == "high"
    assert evaluate_confidence_status(0.849) == "medium"
    assert evaluate_confidence_status(0.70) == "medium"
    assert evaluate_confidence_status(0.699) == "low"
    assert evaluate_confidence_status(0.50) == "low"
    assert evaluate_confidence_status(0.499) == "insufficient"


def test_component_confidence_matrix_integrity():
    """Verify component confidence matrix structure and decoupling."""
    matrix = build_component_confidence_matrix(
        lc_confidence=0.918,
        cd_confidence=0.916,
        is_real_data=False,
        data_source="demo_fallback",
        carbon_tier="Tier 1 / indicative",
        relative_uncertainty_pct=18.3,
    )

    # Classification confidence
    assert matrix.classification_confidence.status == "high"
    assert matrix.classification_confidence.value == 0.918

    # Change detection confidence
    assert matrix.change_detection_confidence.status == "high"
    assert matrix.change_detection_confidence.value == 0.916

    # Carbon methodology status
    assert matrix.carbon_methodology_confidence.status == "indicative"
    assert "Tier 1" in matrix.carbon_methodology_confidence.description

    # System quality indicator
    assert matrix.system_quality_indicator.score >= 80.0
    assert matrix.system_quality_indicator.grade in ["A", "B"]
    assert "software quality" in matrix.system_quality_indicator.formula_note.lower()


def test_field_verification_priority_rules():
    """Verify field verification triggers high/medium priorities appropriately."""
    # Significant loss triggers high priority
    high_prio = evaluate_field_verification_priority(
        loss_ha=9.6,
        gain_ha=34.6,
        classification_conf=0.918,
        change_conf=0.916,
        is_real_data=True,
        village_tag="GOSABA",
    )
    assert high_prio.priority == "high"
    assert "SIGNIFICANT_MANGROVE_LOSS_DETECTED" in high_prio.reason_codes
    assert len(high_prio.recommended_verification) > 0

    # Low loss and high confidence triggers routine/low priority
    routine_prio = evaluate_field_verification_priority(
        loss_ha=0.1,
        gain_ha=0.5,
        classification_conf=0.95,
        change_conf=0.95,
        is_real_data=True,
        village_tag="GOSABA",
    )
    assert routine_prio.priority in ["routine", "low"]


@pytest.mark.anyio
async def test_management_considerations_traceability():
    """Verify management considerations contain evidence references and non-prescriptive tone."""
    evidence_items, _, _ = await build_environmental_evidence("gosaba", year=2025)

    considerations = generate_management_considerations(
        village_name="Gosaba",
        bengali_village_name="গোসাবা",
        loss_ha=9.6,
        gain_ha=34.6,
        mangrove_area_ha=775.6,
        carbon_stock_mg_c=219572.36,
        evidence_items=evidence_items,
        village_tag="GOSABA",
    )

    assert len(considerations) >= 3
    for mc in considerations:
        assert mc.id
        assert mc.title
        assert mc.title_bn
        assert mc.description
        assert mc.description_bn
        assert mc.stakeholder in ["community", "forest_dept", "panchayat", "researcher"]
        assert len(mc.evidence_references) > 0
        # Ensure evidence references exist in evidence_items
        for ref in mc.evidence_references:
            assert any(e.evidence_id == ref for e in evidence_items)
