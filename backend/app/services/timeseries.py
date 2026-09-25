"""Time-series service layer with MongoDB query and demo fallback."""
from fastapi import HTTPException
from ..schemas.change_detection import TimeSeriesData, TimeSeriesPoint
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_TIMESERIES, DEMO_VILLAGES


async def get_time_series(village_id: str) -> TimeSeriesData:
    """Retrieve multi-year trend time-series data."""
    target_id = village_id.lower().strip()

    db = get_database()
    if db is not None:
        try:
            doc = await db.timeseries.find_one({"village_id": target_id}, {"_id": 0})
            if doc:
                return TimeSeriesData(
                    village_id=doc["village_id"],
                    data=[TimeSeriesPoint(**p) for p in doc["data"]],
                )
        except Exception:
            pass

    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found. Available pilot sectors: {[v['id'] for v in DEMO_VILLAGES]}",
        )

    data = DEMO_TIMESERIES.get(target_id)
    if not data:
        base = DEMO_TIMESERIES["gosaba"]["data"]
        scale = village["pilot_area_ha"] / 1245.0
        data = {
            "village_id": village["id"],
            "data": [
                {
                    "year": p["year"],
                    "area_ha": round(p["area_ha"] * scale, 1),
                    "gain_ha": round(p["gain_ha"] * scale, 1),
                    "loss_ha": round(p["loss_ha"] * scale, 1),
                    "carbon_stock": round(p["carbon_stock"] * scale, 1),
                }
                for p in base
            ],
        }

    return TimeSeriesData(
        village_id=data["village_id"],
        data=[TimeSeriesPoint(**p) for p in data["data"]],
    )
