"""Data sources service layer with MongoDB query and demo fallback."""
from typing import List
from ..schemas.data_sources import DataSource, DataSourceBand
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_DATA_SOURCES


async def get_data_sources_list() -> List[DataSource]:
    """Retrieve operational and planned satellite metadata."""
    db = get_database()
    if db is not None:
        try:
            cursor = db.data_sources.find({}, {"_id": 0})
            docs = await cursor.to_list(length=50)
            if docs:
                sources = []
                for s in docs:
                    bands = [DataSourceBand(**b) for b in s.get("bands", [])] if s.get("bands") else None
                    sources.append(
                        DataSource(
                            id=s["id"],
                            name=s["name"],
                            provider=s["provider"],
                            type=s["type"],
                            status=s["status"],
                            last_updated=s["last_updated"],
                            description=s["description"],
                            coverage=s["coverage"],
                            spatial_resolution=s["spatial_resolution"],
                            revisit_days=s["revisit_days"],
                            bands=bands,
                            metadata=s.get("metadata"),
                        )
                    )
                return sources
        except Exception:
            pass

    sources = []
    for s in DEMO_DATA_SOURCES:
        bands = [DataSourceBand(**b) for b in s.get("bands", [])] if s.get("bands") else None
        sources.append(
            DataSource(
                id=s["id"],
                name=s["name"],
                provider=s["provider"],
                type=s["type"],
                status=s["status"],
                last_updated=s["last_updated"],
                description=s["description"],
                coverage=s["coverage"],
                spatial_resolution=s["spatial_resolution"],
                revisit_days=s["revisit_days"],
                bands=bands,
                metadata=s.get("metadata"),
            )
        )
    return sources
