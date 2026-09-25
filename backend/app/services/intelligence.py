"""Environmental Intelligence Service Layer (Phase 7).

Orchestrates Evidence Building, Multi-Component Confidence, Decision Support,
and AI Interpretations with MongoDB persistence.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import HTTPException
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES
from ..data.evidence_rules import STANDARD_DISCLAIMER_EN, STANDARD_DISCLAIMER_BN
from ..intelligence import (
    build_environmental_evidence,
    build_component_confidence_matrix,
    evaluate_field_verification_priority,
    generate_management_considerations,
    generate_environmental_insights,
    EnvironmentalIntelligenceResponse,
    IntelligenceSummaryResponse,
    FieldVerificationResponse,
    EvidenceListResponse,
)

logger = logging.getLogger("sundarban.services.intelligence")


async def get_environmental_intelligence_service(
    village_id: str,
    year: int = 2025,
    from_year: int = 2020,
    to_year: int = 2025,
    lang: str = "en",
    use_gemini: bool = False,
) -> EnvironmentalIntelligenceResponse:
    """Retrieve full structured environmental intelligence report for a village."""
    v_id = village_id.lower().strip()
    village = next((v for v in DEMO_VILLAGES if v["id"] == v_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found. Available pilot sectors: {[v['id'] for v in DEMO_VILLAGES]}",
        )

    if from_year >= to_year:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid comparison period: from_year ({from_year}) must be earlier than to_year ({to_year}).",
        )

    # 1. Check MongoDB cache first if available (and not explicitly forcing Gemini live run)
    db = get_database()
    if db is not None and not use_gemini:
        try:
            cached = await db.environmental_intelligence.find_one(
                {"village_id": v_id, "year": year, "language": lang},
                {"_id": 0},
            )
            if cached:
                return EnvironmentalIntelligenceResponse(**cached)
        except Exception as e:
            logger.debug(f"[Intelligence Service] MongoDB cache read notice: {e}")

    # 2. Build deterministic evidence items and facts
    evidence_items, deterministic_facts, raw_payloads = await build_environmental_evidence(
        village_id=v_id,
        year=year,
        from_year=from_year,
        to_year=to_year,
    )

    lc_data = raw_payloads["land_cover"]
    cd_data = raw_payloads["change_detection"]
    carbon_data = raw_payloads["carbon"]

    # 3. Extract mangrove metrics
    mangrove_item = next((item for item in lc_data.distribution if item.label == "Mangrove"), None)
    mangrove_area_ha = (
        mangrove_item.area_ha
        if mangrove_item
        else (lc_data.class_areas.get("Mangrove", 0.0) if lc_data.class_areas else 0.0)
    )
    raw_conf = mangrove_item.confidence if (mangrove_item and mangrove_item.confidence is not None) else 0.918
    lc_confidence = raw_conf / 100.0 if raw_conf > 1.0 else raw_conf

    cd_conf = (
        cd_data.confidence_summary.mean_change_confidence
        if cd_data.confidence_summary
        else (cd_data.confidence_score / 100.0 if cd_data.confidence_score > 1.0 else cd_data.confidence_score)
    )

    # 4. Build Multi-Component Confidence Matrix
    confidence_matrix = build_component_confidence_matrix(
        lc_confidence=lc_confidence,
        cd_confidence=cd_conf,
        is_real_data=lc_data.is_real_data,
        data_source=lc_data.data_source,
        carbon_tier=carbon_data.methodology.tier,
    )

    # 5. Evaluate Field Verification Priorities
    verification_priority = evaluate_field_verification_priority(
        loss_ha=cd_data.loss_ha,
        gain_ha=cd_data.gain_ha,
        classification_conf=lc_confidence,
        change_conf=cd_conf,
        is_real_data=lc_data.is_real_data,
        village_tag=v_id.upper(),
    )

    # 6. Generate Non-Prescriptive Management Considerations
    stock_mg_c = carbon_data.carbon_stock_mg_c or carbon_data.total_carbon_tons
    management_considerations = generate_management_considerations(
        village_name=village["name"],
        bengali_village_name=village["bengali_name"],
        loss_ha=cd_data.loss_ha,
        gain_ha=cd_data.gain_ha,
        mangrove_area_ha=mangrove_area_ha,
        carbon_stock_mg_c=stock_mg_c,
        evidence_items=evidence_items,
        village_tag=v_id.upper(),
    )

    # 6. Generate AI or Deterministic Fallback Insights
    insights, ai_meta = await generate_environmental_insights(
        village_name=village["name"],
        bengali_village_name=village["bengali_name"],
        year=year,
        from_year=from_year,
        to_year=to_year,
        evidence_items=evidence_items,
        deterministic_facts=deterministic_facts,
        language=lang,
        use_gemini=use_gemini,
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    disclaimer = STANDARD_DISCLAIMER_BN if lang == "bn" else STANDARD_DISCLAIMER_EN

    response = EnvironmentalIntelligenceResponse(
        report_id=f"INTEL-{v_id.upper()}-{year}-{lang.upper()}",
        village_id=v_id,
        village_name=village["name"],
        bengali_village_name=village["bengali_name"],
        region="South 24 Parganas, Indian Sundarbans",
        year=year,
        from_year=from_year,
        to_year=to_year,
        language=lang,
        generated_at=now_iso,
        data_source_status=confidence_matrix.data_source_status.status,
        is_real_data=lc_data.is_real_data,
        methodology_version="phase7-v1.0",
        report_version="1.0",
        insights=insights,
        confidence=confidence_matrix,
        verification=verification_priority,
        management_considerations=management_considerations,
        deterministic_facts=deterministic_facts,
        evidence_items=evidence_items,
        ai_metadata=ai_meta,
        disclaimer=disclaimer,
    )

    # 7. Persist to MongoDB asynchronously
    if db is not None:
        try:
            doc = response.model_dump(by_alias=False)
            await db.environmental_intelligence.update_one(
                {"village_id": v_id, "year": year, "language": lang},
                {"$set": doc},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"[Intelligence Service] MongoDB persistence notice: {e}")

    return response


async def get_intelligence_summary_service(
    village_id: str,
    year: int = 2025,
) -> IntelligenceSummaryResponse:
    """Retrieve concise intelligence executive summary."""
    v_id = village_id.lower().strip()
    village = next((v for v in DEMO_VILLAGES if v["id"] == v_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found.",
        )

    full_intel = await get_environmental_intelligence_service(village_id=v_id, year=year, lang="en")
    ev_map = {e.metric: e for e in full_intel.evidence_items}
    mangrove_ha = float(ev_map.get("mangrove_area_ha").value) if "mangrove_area_ha" in ev_map else 775.6
    net_ha = float(ev_map.get("net_mangrove_change_ha").value) if "net_mangrove_change_ha" in ev_map else 25.0
    stock_mg_c = float(ev_map.get("total_carbon_stock_mg_c").value) if "total_carbon_stock_mg_c" in ev_map else 219572.36

    return IntelligenceSummaryResponse(
        village_id=v_id,
        village_name=village["name"],
        year=year,
        executive_summary=full_intel.insights.executive_summary,
        executive_summary_bn=full_intel.insights.executive_summary_bn or full_intel.insights.executive_summary,
        mangrove_area_ha=round(mangrove_ha, 2),
        net_change_ha=round(net_ha, 2),
        carbon_stock_mg_c=round(stock_mg_c, 2),
        system_quality_indicator=full_intel.confidence.system_quality_indicator.score,
        verification_priority=full_intel.verification.priority,
        is_real_data=full_intel.is_real_data,
        data_source=full_intel.data_source_status,
    )


async def get_field_verification_service(
    village_id: str,
    year: int = 2025,
) -> FieldVerificationResponse:
    """Retrieve dedicated field verification prioritization."""
    v_id = village_id.lower().strip()
    village = next((v for v in DEMO_VILLAGES if v["id"] == v_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found.",
        )

    full_intel = await get_environmental_intelligence_service(village_id=v_id, year=year, lang="en")
    return FieldVerificationResponse(
        village_id=v_id,
        village_name=village["name"],
        year=year,
        verification=full_intel.verification,
        key_flags=full_intel.verification.reason_codes,
    )


async def get_evidence_list_service(
    village_id: str,
    year: int = 2025,
) -> EvidenceListResponse:
    """Retrieve full atomic evidence registry for auditing."""
    v_id = village_id.lower().strip()
    village = next((v for v in DEMO_VILLAGES if v["id"] == v_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found.",
        )

    evidence_items, _, _ = await build_environmental_evidence(village_id=v_id, year=year)
    return EvidenceListResponse(
        village_id=v_id,
        year=year,
        evidence_count=len(evidence_items),
        evidence_items=evidence_items,
    )
