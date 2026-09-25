"""Villages service layer with MongoDB query and demo fallback."""
from typing import List, Optional
from ..schemas.monitoring import Village
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES


async def get_villages_list() -> List[Village]:
    """Retrieve all monitored pilot villages."""
    db = get_database()
    if db is not None:
        try:
            cursor = db.villages.find({}, {"_id": 0})
            docs = await cursor.to_list(length=100)
            if docs:
                return [Village(**v) for v in docs]
        except Exception:
            pass  # Fall back to demo data

    return [Village(**v) for v in DEMO_VILLAGES]


async def get_village_by_id(village_id: str) -> Optional[Village]:
    """Retrieve a single village by ID."""
    target_id = village_id.lower().strip()
    db = get_database()
    if db is not None:
        try:
            doc = await db.villages.find_one({"id": target_id}, {"_id": 0})
            if doc:
                return Village(**doc)
        except Exception:
            pass

    match = next((v for v in DEMO_VILLAGES if v["id"] == target_id), None)
    if match:
        return Village(**match)
    return None
