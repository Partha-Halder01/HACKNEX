"""Overview service layer with MongoDB query and demo fallback."""
from typing import Optional
from ..schemas.overview import OverviewMetrics
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_OVERVIEW, DEMO_VILLAGES


async def get_overview_metrics(village_id: Optional[str] = None) -> OverviewMetrics:
    """Retrieve overview KPI metrics with optional village filter."""
    db = get_database()
    if db is not None:
        try:
            if village_id:
                target_id = village_id.lower().strip()
                vdoc = await db.villages.find_one({"id": target_id}, {"_id": 0})
                if vdoc:
                    return OverviewMetrics(
                        pilot_area_ha=vdoc.get("pilot_area_ha", 1245.0),
                        observation_period="2020–2025",
                        estimated_carbon_tons=round(vdoc.get("pilot_area_ha", 1245.0) * 14.8),
                        active_alerts_count=3,
                        mangrove_health_index=84,
                        last_satellite_sync="2025-05-15T06:30:00Z",
                        village_id=vdoc["id"],
                    )
        except Exception:
            pass  # Fall back to demo data

    data = dict(DEMO_OVERVIEW)
    if village_id:
        target_id = village_id.lower().strip()
        matched_village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), None)
        if matched_village:
            data["pilot_area_ha"] = matched_village["pilot_area_ha"]
            data["village_id"] = matched_village["id"]
            data["estimated_carbon_tons"] = round(matched_village["pilot_area_ha"] * 14.8)
    return OverviewMetrics(**data)
