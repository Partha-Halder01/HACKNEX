"""Validation and guardrail verification for AI environmental insights (Phase 7).

Verifies that AI-generated interpretations strictly cite valid evidence IDs and contains zero forbidden claims.
"""
import logging
from typing import Any, Dict, List, Set, Tuple
from ..data.evidence_rules import check_forbidden_claims
from ..schemas.intelligence import AIEnvironmentalInsights, EvidenceItem

logger = logging.getLogger("sundarban.intelligence.validator")


def validate_ai_insights(
    raw_insights: Dict[str, Any],
    evidence_items: List[EvidenceItem],
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """Validate structured AI insights against evidence registry and safety guardrails.

    Returns:
        Tuple of (is_valid, list_of_issues, validated_insights_dict)
    """
    issues: List[str] = []
    valid_evidence_ids: Set[str] = {e.evidence_id for e in evidence_items}

    # 1. Check required fields
    required_keys = [
        "executiveSummary",
        "landCoverSummary",
        "changeSummary",
        "carbonSummary",
        "uncertaintySummary",
        "limitations",
        "evidenceReferences",
    ]

    for key in required_keys:
        if key not in raw_insights or not raw_insights[key]:
            issues.append(f"Missing or empty required insight section: '{key}'")

    if issues:
        return False, issues, raw_insights

    # 2. Validate Evidence References
    refs = raw_insights.get("evidenceReferences", [])
    if not isinstance(refs, list) or len(refs) == 0:
        issues.append("Insight does not provide any 'evidenceReferences'.")
    else:
        invalid_refs = [r for r in refs if r not in valid_evidence_ids]
        if invalid_refs:
            issues.append(f"Insight cited invalid or fabricated Evidence IDs: {invalid_refs}")

    # 3. Check Forbidden Claims / Hallucinations
    text_fields = [
        raw_insights.get("executiveSummary", ""),
        raw_insights.get("landCoverSummary", ""),
        raw_insights.get("changeSummary", ""),
        raw_insights.get("carbonSummary", ""),
        raw_insights.get("uncertaintySummary", ""),
    ]

    for lim in raw_insights.get("limitations", []):
        if isinstance(lim, str):
            text_fields.append(lim)

    for field_text in text_fields:
        forbidden = check_forbidden_claims(field_text)
        if forbidden:
            issues.append(f"Forbidden or unverified claim detected matching pattern: {forbidden}")

    is_valid = len(issues) == 0
    if not is_valid:
        logger.warning(f"[Guardrail Validator] AI insight failed verification: {issues}")

    return is_valid, issues, raw_insights
