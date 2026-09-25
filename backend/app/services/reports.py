"""Bilingual village report service layer with Phase 7 Environmental Intelligence integration."""
import logging
from typing import Any, Dict
from fastapi import HTTPException
from ..schemas.reports import (
    VillageReport,
    LandCoverFindings,
    ChangeFindings,
    CarbonFindings,
    ReportObservation,
    RecommendedAction,
)
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES
from .intelligence import get_environmental_intelligence_service

logger = logging.getLogger("sundarban.services.reports")


async def get_village_report(village_id: str, lang: str = "bn", use_gemini: bool = False) -> VillageReport:
    """Retrieve structured bilingual village report powered by Phase 7 Environmental Intelligence."""
    target_id = village_id.lower().strip()

    if lang not in ["bn", "en"]:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid language '{lang}'. Supported language codes: 'bn' (Bengali) or 'en' (English).",
        )

    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found. Available pilot sectors: {[v['id'] for v in DEMO_VILLAGES]}",
        )

    is_bn = lang == "bn"

    # Fetch complete evidence-grounded environmental intelligence
    intel = await get_environmental_intelligence_service(
        village_id=target_id,
        year=2025,
        from_year=2020,
        to_year=2025,
        lang=lang,
        use_gemini=use_gemini,
    )

    # Extract metrics from evidence items
    ev_map = {e.metric: e for e in intel.evidence_items}
    mangrove_ha = float(ev_map.get("mangrove_area_ha").value) if "mangrove_area_ha" in ev_map else round(village["pilot_area_ha"] * 0.60, 1)
    mangrove_pct = float(ev_map.get("mangrove_percentage").value) if "mangrove_percentage" in ev_map else 60.0
    gain_ha = float(ev_map.get("gross_mangrove_gain_ha").value) if "gross_mangrove_gain_ha" in ev_map else 25.0
    loss_ha = float(ev_map.get("gross_mangrove_loss_ha").value) if "gross_mangrove_loss_ha" in ev_map else 9.5
    net_ha = float(ev_map.get("net_mangrove_change_ha").value) if "net_mangrove_change_ha" in ev_map else 15.5
    carbon_val = float(ev_map.get("co2e_equivalent_mg").value) if "co2e_equivalent_mg" in ev_map else round(mangrove_ha * 14.8)

    # Convert management considerations to RecommendedActions
    actions = []
    for idx, mc in enumerate(intel.management_considerations):
        actions.append(
            RecommendedAction(
                id=f"act-{idx+1}",
                title=mc.title_bn if is_bn else mc.title,
                description=mc.description_bn if is_bn else mc.description,
                priority=mc.priority,
                stakeholder=mc.stakeholder,
            )
        )

    # Build observations from AI/Deterministic Insights
    observations = [
        ReportObservation(
            id="obs-1",
            title="বন আচ্ছাদন ও ক্যানোপি স্থিতি" if is_bn else "Canopy Integrity & Distribution",
            detail=intel.insights.land_cover_summary_bn if is_bn and intel.insights.land_cover_summary_bn else intel.insights.land_cover_summary,
            severity="positive",
        ),
        ReportObservation(
            id="obs-2",
            title="উপকূলীয় পরিবর্তন ও গতিশীলতা" if is_bn else "Coastal Transition Dynamics",
            detail=intel.insights.change_summary_bn if is_bn and intel.insights.change_summary_bn else intel.insights.change_summary,
            severity="warning" if loss_ha > 5.0 else "info",
        ),
        ReportObservation(
            id="obs-3",
            title="মডেল-ভিত্তিক নীল কার্বন মজুত" if is_bn else "Model-Based Blue Carbon Stock",
            detail=intel.insights.carbon_summary_bn if is_bn and intel.insights.carbon_summary_bn else intel.insights.carbon_summary,
            severity="info",
        ),
    ]

    summary_text = (
        intel.insights.executive_summary_bn
        if is_bn and intel.insights.executive_summary_bn
        else intel.insights.executive_summary
    )

    report_obj = VillageReport(
        id=f"rep-{target_id}-2025-{lang}",
        village_id=village["id"],
        village_name=village["name"],
        bengali_village_name=village["bengali_name"],
        region="South 24 Parganas, Indian Sundarbans",
        report_date="15 May 2025",
        period="২০২০–২০২৫" if is_bn else "2020–2025",
        language=lang,
        summary_text=summary_text,
        land_cover_findings=LandCoverFindings(
            total_area_ha=village["pilot_area_ha"],
            mangrove_area_ha=mangrove_ha,
            mangrove_percentage=mangrove_pct,
        ),
        change_findings=ChangeFindings(
            gain_ha=gain_ha,
            loss_ha=loss_ha,
            net_change_ha=net_ha,
        ),
        carbon_estimate=CarbonFindings(
            estimated_tons=carbon_val,
            factor_used=14.8,
        ),
        key_observations=observations,
        recommended_actions=actions,
    )

    # Persist to MongoDB environmental_reports if available
    db = get_database()
    if db is not None:
        try:
            doc = report_obj.model_dump(by_alias=False)
            await db.environmental_reports.update_one(
                {"village_id": target_id, "year": 2025, "language": lang},
                {"$set": doc},
                upsert=True,
            )
        except Exception as e:
            logger.debug(f"[Reports Service] MongoDB persistence notice: {e}")

    return report_obj
