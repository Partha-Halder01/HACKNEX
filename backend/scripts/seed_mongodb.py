"""MongoDB Data Seeding Script for Sundarban Blue Carbon.

Transforms demonstration dataset into GeoJSON-compliant MongoDB documents
and ensures 2dsphere geospatial indexing.

Usage:
  cd backend
  python scripts/seed_mongodb.py
"""

import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.db.indexes import create_indexes
from app.data.demo_data import (
    DEMO_OVERVIEW,
    DEMO_VILLAGES,
    DEMO_LANDCOVER,
    DEMO_CHANGE,
    DEMO_TIMESERIES,
    DEMO_CARBON,
    DEMO_REPORTS,
    DEMO_DATA_SOURCES,
    DEMO_MAP_POLYGONS,
)


async def seed_database() -> None:
    uri = settings.MONGODB_URI or "mongodb://localhost:27017"
    db_name = settings.MONGODB_DATABASE

    print(f"[*] Connecting to MongoDB: {uri} (Database: {db_name})...")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)

    try:
        await client.admin.command("ping")
        print("[+] MongoDB connection successful.")
    except Exception as e:
        print(f"[-] MongoDB connection failed: {e}")
        print("[-] Ensure local MongoDB or MongoDB Atlas is reachable.")
        return

    db = client[db_name]

    print("[*] Creating 2dsphere geospatial indexes...")
    await create_indexes(db)

    # 1. Seed Villages (Transform GPS coordinates to GeoJSON Point [lng, lat])
    print("[*] Seeding 'villages' collection with GeoJSON Points...")
    await db.villages.delete_many({})
    village_docs = []
    for v in DEMO_VILLAGES:
        lat, lng = v["coordinates"]
        doc = {
            "id": v["id"],
            "name": v["name"],
            "bengali_name": v["bengali_name"],
            "location": {
                "type": "Point",
                "coordinates": [lng, lat],  # GeoJSON [longitude, latitude]
            },
            "coordinates": [lat, lng],  # Presentation coords
            "pilot_area_ha": v["pilot_area_ha"],
            "description": v["description"],
            "mangrove_cover_percentage": v["mangrove_cover_percentage"],
            "status": "demo",
        }
        village_docs.append(doc)
    if village_docs:
        await db.villages.insert_many(village_docs)
    print(f"[+] Inserted {len(village_docs)} village documents.")

    # 2. Seed Spatial Monitoring (GeoJSON Polygons [lng, lat])
    print("[*] Seeding 'monitoring' collection with GeoJSON Polygons...")
    await db.monitoring.delete_many({})
    monitoring_docs = []
    for v in DEMO_VILLAGES:
        is_sat = v["id"] == "satjelia"
        # Convert lat,lng list to GeoJSON [lng, lat]
        raw_poly = DEMO_MAP_POLYGONS["mangroves"][0]
        geojson_coords = [[pt[1], pt[0]] for pt in raw_poly]
        # Close polygon if not closed
        if geojson_coords[0] != geojson_coords[-1]:
            geojson_coords.append(geojson_coords[0])

        doc = {
            "village_id": v["id"],
            "village_name": v["name"],
            "year": 2025,
            "total_area_ha": v["pilot_area_ha"],
            "mangrove_area_ha": 569.4 if is_sat else 775.6,
            "water_area_ha": 278.3 if is_sat else 300.0,
            "aquaculture_area_ha": 77.4 if is_sat else 108.3,
            "bare_land_area_ha": 31.4 if is_sat else 34.9,
            "other_veg_area_ha": 23.5 if is_sat else 26.2,
            "polygons": [
                {
                    "id": "poly-core-1",
                    "name": f"{v['name']} Core Mangrove Tract",
                    "category": "Mangrove",
                    "color": "#16845f",
                    "fill_color": "#16845f",
                    "coordinates": raw_poly,
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [geojson_coords],
                    },
                    "area_ha": 380.0 if is_sat else 420.5,
                    "health_index": 0.86,
                }
            ],
            "satellite_source": "Copernicus Sentinel-2 MSI",
            "acquisition_date": "2025-05-15",
        }
        monitoring_docs.append(doc)
    if monitoring_docs:
        await db.monitoring.insert_many(monitoring_docs)
    print(f"[+] Inserted {len(monitoring_docs)} spatial monitoring documents.")

    # 3. Seed Land Cover
    print("[*] Seeding 'land_cover' collection...")
    await db.land_cover.delete_many({})
    lc_docs = list(DEMO_LANDCOVER.values())
    if lc_docs:
        await db.land_cover.insert_many(lc_docs)
    print(f"[+] Inserted {len(lc_docs)} land cover documents.")

    # 4. Seed Change Detection
    print("[*] Seeding 'change_detection' collection...")
    await db.change_detection.delete_many({})
    cd_docs = list(DEMO_CHANGE.values())
    if cd_docs:
        await db.change_detection.insert_many(cd_docs)
    print(f"[+] Inserted {len(cd_docs)} change detection documents.")

    # 5. Seed Timeseries
    print("[*] Seeding 'timeseries' collection...")
    await db.timeseries.delete_many({})
    ts_docs = list(DEMO_TIMESERIES.values())
    if ts_docs:
        await db.timeseries.insert_many(ts_docs)
    print(f"[+] Inserted {len(ts_docs)} timeseries documents.")

    # 6. Seed Carbon Estimates
    print("[*] Seeding 'carbon_estimates' collection...")
    await db.carbon_estimates.delete_many({})
    carbon_docs = list(DEMO_CARBON.values())
    if carbon_docs:
        await db.carbon_estimates.insert_many(carbon_docs)
    print(f"[+] Inserted {len(carbon_docs)} carbon estimate documents.")

    # 7. Seed Bilingual Reports
    print("[*] Seeding 'reports' collection...")
    await db.reports.delete_many({})
    rep_docs = []
    for vid, lang_map in DEMO_REPORTS.items():
        for lang, rep in lang_map.items():
            rep_docs.append(rep)
    if rep_docs:
        await db.reports.insert_many(rep_docs)
    print(f"[+] Inserted {len(rep_docs)} bilingual report documents.")

    # 8. Seed Data Sources
    print("[*] Seeding 'data_sources' collection...")
    await db.data_sources.delete_many({})
    if DEMO_DATA_SOURCES:
        await db.data_sources.insert_many(DEMO_DATA_SOURCES)
    print(f"[+] Inserted {len(DEMO_DATA_SOURCES)} data source documents.")

    client.close()
    print("\n[✓] MongoDB Database Seeding Complete! Ready for MongoDB Compass inspection.")


if __name__ == "__main__":
    asyncio.run(seed_database())
