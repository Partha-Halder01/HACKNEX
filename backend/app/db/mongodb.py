"""MongoDB connection management using Motor (async driver)."""
import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from ..core.config import settings

logger = logging.getLogger("sundarban.mongodb")

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> Optional[AsyncIOMotorDatabase]:
    """Initialize async MongoDB client using Motor."""
    global _client, _db

    if not settings.MONGODB_URI:
        logger.info("[MongoDB] MONGODB_URI not configured. Operating in in-memory fallback mode.")
        _db = None
        return None

    try:
        # Create Motor async client with 2.5s server selection timeout
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=2500,
        )
        # Test connection with ping command
        await _client.admin.command("ping")
        _db = _client[settings.MONGODB_DATABASE]
        logger.info(f"[MongoDB] Successfully connected to database: {settings.MONGODB_DATABASE}")
        return _db
    except Exception as e:
        logger.warning(f"[MongoDB] Could not connect to MongoDB ({e}). Falling back to static demo data.")
        _client = None
        _db = None
        return None


async def close_mongo_connection() -> None:
    """Close async MongoDB client."""
    global _client, _db
    if _client:
        _client.close()
        logger.info("[MongoDB] Connection closed.")
        _client = None
        _db = None


def get_database() -> Optional[AsyncIOMotorDatabase]:
    """Retrieve active database handle (or None if offline)."""
    return _db
