"""Region-wide Sentinel-2 photo of the Sundarbans as a map background.

One cloud-masked median composite of the latest complete Jan–Mar dry season
over the whole delta, rendered as true colour by Earth Engine. Tiles are
computed on demand by Earth Engine; this module only creates the map id and
caches its tile URL (map ids stay valid for hours, we refresh every 6 h).
"""
import logging
import threading
import time
from datetime import date
from typing import Any, Dict, Optional

from ..core.config import settings
from .request import SUNDARBAN_BBOX

logger = logging.getLogger("sundarban.analysis.basemap")

CACHE_SECONDS = 6 * 3600
MAX_SCENE_CLOUD_PCT = 40
TRUE_COLOR_VIS = {"bands": ["B4", "B3", "B2"], "min": 0, "max": 2500, "gamma": 1.1}

_cache: Dict[int, Dict[str, Any]] = {}
_lock = threading.Lock()


def latest_dry_season_year(today: Optional[date] = None) -> int:
    today = today or date.today()
    return today.year if today >= date(today.year, 4, 1) else today.year - 1


def true_color_composite(region: Any, start: str, end: str) -> Any:
    """Cloud-masked median Sentinel-2 composite (unclipped) for visualisation."""
    import ee

    from ..geospatial.preprocessing import mask_s2_sr_clouds

    return (
        ee.ImageCollection(settings.SENTINEL_COLLECTION)
        .filterBounds(region)
        .filterDate(start, end)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", MAX_SCENE_CLOUD_PCT))
        .map(mask_s2_sr_clouds)
        .median()
    )


def get_basemap(year: Optional[int] = None) -> Dict[str, Any]:
    """Tile URL for the Sundarbans dry-season photo, or {available: False, reason}."""
    from ..geospatial.gee_client import initialize_gee

    ok, code, msg = initialize_gee()
    if not ok:
        return {"available": False, "reason": msg or code}

    year = year or latest_dry_season_year()
    with _lock:
        hit = _cache.get(year)
        if hit and hit["expiresAt"] > time.time():
            return hit

    import ee

    b = SUNDARBAN_BBOX
    region = ee.Geometry.Rectangle([b["west"], b["south"], b["east"], b["north"]])
    try:
        image = true_color_composite(region, f"{year}-01-01", f"{year}-04-01").clip(region)
        url = image.getMapId(TRUE_COLOR_VIS)["tile_fetcher"].url_format
    except Exception as e:  # never break the page over a background layer
        logger.warning(f"[Basemap] Earth Engine map id failed: {e}")
        return {"available": False, "reason": f"Earth Engine basemap failed ({type(e).__name__})"}

    result = {
        "available": True,
        "tileUrl": url,
        "year": year,
        "season": f"{year}-01-01 to {year}-03-31",
        "bounds": [[b["south"], b["west"]], [b["north"], b["east"]]],
        "attribution": "Contains modified Copernicus Sentinel-2 data · Google Earth Engine",
        "expiresAt": time.time() + CACHE_SECONDS,
    }
    with _lock:
        _cache[year] = result
    return result
