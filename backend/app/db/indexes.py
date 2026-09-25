"""MongoDB 2dsphere and compound index management."""
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("sundarban.indexes")


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create 2dsphere spatial indexes and query performance indexes."""
    if db is None:
        return

    try:
        # Geospatial 2dsphere index on village coordinates
        await db.villages.create_index([("location", "2dsphere")])
        logger.info("[Indexes] Created 2dsphere index on 'villages.location'")

        # Geospatial 2dsphere index on monitoring polygons
        await db.monitoring.create_index([("polygons.geometry", "2dsphere")])
        logger.info("[Indexes] Created 2dsphere index on 'monitoring.polygons.geometry'")

        # Geospatial 2dsphere index on raw Sentinel-2 observation geometries
        await db.geospatial_observations.create_index([("geometry", "2dsphere")])
        logger.info("[Indexes] Created 2dsphere index on 'geospatial_observations.geometry'")

        # Query optimization indexes
        await db.villages.create_index([("id", 1)], unique=True)
        await db.land_cover.create_index([("village_id", 1), ("year", 1)])
        await db.change_detection.create_index([("village_id", 1), ("from_year", 1), ("to_year", 1)], unique=True)
        await db.timeseries.create_index([("village_id", 1)], unique=True)
        await db.carbon_estimates.create_index([("village_id", 1), ("year", 1)])
        await db.reports.create_index([("village_id", 1), ("language", 1)])
        await db.environmental_intelligence.create_index([("village_id", 1), ("year", 1)])
        await db.environmental_intelligence.create_index([("village_id", 1), ("generated_at", 1)])
        await db.environmental_reports.create_index([("village_id", 1), ("year", 1), ("language", 1)])
        await db.data_sources.create_index([("id", 1)], unique=True)
        await db.geospatial_observations.create_index([("village_id", 1), ("year", 1)], unique=True)
        await db.land_cover_classifications.create_index([("village_id", 1), ("year", 1)], unique=True)
        await db.land_cover_classifications.create_index([("geometry", "2dsphere")])
        logger.info("[Indexes] Successfully ensured all MongoDB indexes.")
    except Exception as e:
        logger.warning(f"[Indexes] Error creating MongoDB indexes: {e}")

