"""Spatial monitoring service layer with MongoDB query and demo fallback."""
from typing import Optional
from fastapi import HTTPException
from ..schemas.monitoring import SpatialMonitoringData, LandCoverPolygon
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_VILLAGES, DEMO_MAP_POLYGONS


async def get_spatial_monitoring(village_id: str, year: Optional[int] = 2025) -> SpatialMonitoringData:
    """Retrieve spatial monitoring layers and polygons for a given village."""
    target_id = village_id.lower().strip()

    db = get_database()
    if db is not None:
        try:
            doc = await db.monitoring.find_one({"village_id": target_id}, {"_id": 0})
            if doc:
                effective_year = year or doc.get("year", 2025)
                doc["year"] = effective_year
                return SpatialMonitoringData(
                    village_id=doc["village_id"],
                    village_name=doc["village_name"],
                    year=doc["year"],
                    total_area_ha=doc["total_area_ha"],
                    mangrove_area_ha=doc["mangrove_area_ha"],
                    water_area_ha=doc["water_area_ha"],
                    aquaculture_area_ha=doc["aquaculture_area_ha"],
                    bare_land_area_ha=doc["bare_land_area_ha"],
                    other_veg_area_ha=doc["other_veg_area_ha"],
                    polygons=[LandCoverPolygon(**p) for p in doc["polygons"]],
                    satellite_source=doc["satellite_source"],
                    acquisition_date=doc["acquisition_date"],
                )
        except Exception:
            pass

    village = next((v for v in DEMO_VILLAGES if v["id"] == target_id), None)
    if not village:
        raise HTTPException(
            status_code=404,
            detail=f"Village '{village_id}' not found. Available pilot sectors: {[v['id'] for v in DEMO_VILLAGES]}",
        )

    effective_year = year or 2025
    is_satjelia = target_id == "satjelia"

    polygons = [
        LandCoverPolygon(
            id="poly-1",
            name=f"{village['name']} Core Mangrove Tract",
            category="Mangrove",
            color="#16845f",
            fill_color="#16845f",
            coordinates=DEMO_MAP_POLYGONS["mangroves"][0],
            area_ha=380.5 if is_satjelia else 420.5,
            health_index=0.86,
        ),
        LandCoverPolygon(
            id="poly-2",
            name=f"{village['name']} Tidal Creek",
            category="Water",
            color="#3896d8",
            fill_color="#3896d8",
            coordinates=DEMO_MAP_POLYGONS["water"][0],
            area_ha=180.0 if is_satjelia else 210.0,
            health_index=None,
        ),
    ]

    return SpatialMonitoringData(
        village_id=village["id"],
        village_name=village["name"],
        year=effective_year,
        total_area_ha=village["pilot_area_ha"],
        mangrove_area_ha=569.4 if is_satjelia else 775.6,
        water_area_ha=278.3 if is_satjelia else 300.0,
        aquaculture_area_ha=77.4 if is_satjelia else 108.3,
        bare_land_area_ha=31.4 if is_satjelia else 34.9,
        other_veg_area_ha=23.5 if is_satjelia else 26.2,
        polygons=polygons,
        satellite_source="Copernicus Sentinel-2 MSI",
        acquisition_date="2025-05-15",
    )
