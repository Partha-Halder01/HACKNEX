"""Sentinel-2 Harmonized Surface Reflectance data ingestion and composite generation.

Dataset: COPERNICUS/S2_SR_HARMONIZED
Required Bands:
- B2: Blue (490 nm, 10m native)
- B3: Green (560 nm, 10m native)
- B4: Red (665 nm, 10m native)
- B8: NIR (842 nm, 10m native)
- B11: SWIR-1 (1610 nm, 20m native)
- B12: SWIR-2 (2190 nm, 20m native)
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

from .indices import calculate_ndvi, calculate_ndwi
from .preprocessing import mask_s2_sr_clouds

logger = logging.getLogger("sundarban.geospatial.sentinel2")

REQUIRED_BANDS: List[str] = ["B2", "B3", "B4", "B8", "B11", "B12"]

BAND_METADATA: Dict[str, Dict[str, Any]] = {
    "B2": {"name": "Blue", "wavelength_nm": 490, "native_res_m": 10, "description": "Atmospheric scattering & deep water"},
    "B3": {"name": "Green", "wavelength_nm": 560, "native_res_m": 10, "description": "Vegetation peak green reflectance & NDWI"},
    "B4": {"name": "Red", "wavelength_nm": 665, "native_res_m": 10, "description": "Chlorophyll absorption peak & NDVI"},
    "B8": {"name": "Near Infrared (NIR)", "wavelength_nm": 842, "native_res_m": 10, "description": "Mesophyll leaf structure reflectance"},
    "B11": {"name": "Shortwave Infrared-1 (SWIR-1)", "wavelength_nm": 1610, "native_res_m": 20, "description": "Moisture & soil differentiation"},
    "B12": {"name": "Shortwave Infrared-2 (SWIR-2)", "wavelength_nm": 2190, "native_res_m": 20, "description": "Geology & burned/bare soil"},
}


class SentinelProcessingError(Exception):
    """Raised when Sentinel-2 query or composite generation fails."""
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def get_seasonal_date_range(
    year: int,
    start_month: Optional[int] = None,
    start_day: Optional[int] = None,
    end_month: Optional[int] = None,
    end_day: Optional[int] = None,
) -> Tuple[str, str]:
    """Construct ISO date strings for the requested year's analytical window."""
    from app.core.config import settings

    s_m = start_month or settings.SENTINEL_START_MONTH
    s_d = start_day or settings.SENTINEL_START_DAY
    e_m = end_month or settings.SENTINEL_END_MONTH
    e_d = end_day or settings.SENTINEL_END_DAY

    start_date = f"{year:04d}-{s_m:02d}-{s_d:02d}"
    end_date = f"{year:04d}-{e_m:02d}-{e_d:02d}"

    if start_date > end_date:
        raise SentinelProcessingError(
            "INVALID_DATE_RANGE",
            f"Start date '{start_date}' cannot be after end date '{end_date}'."
        )

    return start_date, end_date


def load_sentinel_collection(
    geometry: Any,
    start_date: str,
    end_date: str,
    cloud_threshold: Optional[int] = None,
    collection_id: Optional[str] = None,
) -> Any:
    """Load filtered Sentinel-2 Surface Reflectance ImageCollection from Earth Engine.

    Args:
        geometry: ee.Geometry region
        start_date: 'YYYY-MM-DD'
        end_date: 'YYYY-MM-DD'
        cloud_threshold: Maximum cloudy pixel percentage (default from config)
        collection_id: Earth Engine collection identifier

    Returns:
        ee.ImageCollection
    """
    try:
        import ee
    except ImportError as e:
        raise SentinelProcessingError("GEE_LIBRARY_MISSING", "earthengine-api not installed.") from e

    from app.core.config import settings
    cid = collection_id or settings.SENTINEL_COLLECTION
    c_threshold = cloud_threshold if cloud_threshold is not None else settings.SENTINEL_CLOUD_PERCENT

    logger.info(
        f"[Sentinel-2] Querying {cid} | Window: {start_date} -> {end_date} | Cloud Thresh: <={c_threshold}%"
    )

    collection = (
        ee.ImageCollection(cid)
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", c_threshold))
    )

    return collection


def build_sentinel_composite(
    geometry: Any,
    start_date: str,
    end_date: str,
    cloud_threshold: Optional[int] = None,
    collection_id: Optional[str] = None,
) -> Tuple[Any, Dict[str, Any]]:
    """Build a cloud-masked median composite clipped to AOI, with NDVI and NDWI bands.

    Returns:
        (composite_image, metadata_dict)
    """
    try:
        import ee
    except ImportError as e:
        raise SentinelProcessingError("GEE_LIBRARY_MISSING", "earthengine-api not installed.") from e

    from app.core.config import settings
    cid = collection_id or settings.SENTINEL_COLLECTION
    c_thresh = cloud_threshold if cloud_threshold is not None else settings.SENTINEL_CLOUD_PERCENT

    collection = load_sentinel_collection(
        geometry=geometry,
        start_date=start_date,
        end_date=end_date,
        cloud_threshold=c_thresh,
        collection_id=cid,
    )

    # Count matching scenes
    image_count = int(collection.size().getInfo())
    logger.info(f"[Sentinel-2] Retrieved {image_count} scenes matching filter criteria.")

    if image_count == 0:
        raise SentinelProcessingError(
            "NO_SENTINEL_IMAGES",
            f"No Sentinel-2 imagery found in collection '{cid}' for date window "
            f"{start_date} to {end_date} with cloud threshold <= {c_thresh}%."
        )

    # Apply pixel-level cloud & shadow masking to each scene
    masked_collection = collection.map(mask_s2_sr_clouds)

    # Compute median composite
    median_composite = masked_collection.median().clip(geometry)

    # Select only required bands and calculate indices
    composite_with_bands = median_composite.select(REQUIRED_BANDS)
    composite_with_ndvi = calculate_ndvi(composite_with_bands)
    final_composite = calculate_ndwi(composite_with_ndvi)

    metadata = {
        "collectionId": cid,
        "startDate": start_date,
        "endDate": end_date,
        "imageCount": image_count,
        "cloudThreshold": c_thresh,
        "compositeMethod": "median",
        "bands": REQUIRED_BANDS,
        "indices": ["NDVI", "NDWI"],
        "resolutionMeters": 20,
    }

    return final_composite, metadata


def extract_zonal_statistics(
    image: Any,
    geometry: Any,
    scale: int = 20,
) -> Dict[str, Any]:
    """Compute spatial statistics (min, max, mean, median, stdDev) for all bands and indices."""
    try:
        import ee
    except ImportError as e:
        raise SentinelProcessingError("GEE_LIBRARY_MISSING", "earthengine-api not installed.") from e

    # Build combined reducers for mean, median, min, max, stdDev
    combined_reducer = (
        ee.Reducer.mean()
        .combine(ee.Reducer.median(), "", True)
        .combine(ee.Reducer.min(), "", True)
        .combine(ee.Reducer.max(), "", True)
        .combine(ee.Reducer.stdDev(), "", True)
    )

    try:
        stats_raw = image.reduceRegion(
            reducer=combined_reducer,
            geometry=geometry,
            scale=scale,
            maxPixels=1e9,
            bestEffort=True,
        ).getInfo()
    except Exception as e:
        logger.error(f"[Sentinel-2] reduceRegion failed: {e}")
        raise SentinelProcessingError(
            "PROCESSING_FAILED",
            f"Failed to calculate zonal statistics over AOI: {str(e)}"
        ) from e

    # Parse and structure stats per band and per index
    bands_stats: Dict[str, Dict[str, float]] = {}
    indices_stats: Dict[str, Dict[str, float]] = {}

    target_keys = REQUIRED_BANDS + ["NDVI", "NDWI"]

    for key in target_keys:
        val_mean = stats_raw.get(f"{key}_mean")
        val_median = stats_raw.get(f"{key}_median")
        val_min = stats_raw.get(f"{key}_min")
        val_max = stats_raw.get(f"{key}_max")
        val_std = stats_raw.get(f"{key}_stdDev")

        parsed = {
            "min": round(float(val_min), 4) if val_min is not None else 0.0,
            "max": round(float(val_max), 4) if val_max is not None else 0.0,
            "mean": round(float(val_mean), 4) if val_mean is not None else 0.0,
            "median": round(float(val_median), 4) if val_median is not None else 0.0,
            "stdDev": round(float(val_std), 4) if val_std is not None else 0.0,
        }

        if key in ("NDVI", "NDWI"):
            indices_stats[key] = parsed
        else:
            bands_stats[key] = parsed

    return {
        "bands": bands_stats,
        "indices": indices_stats,
        "scale": scale,
    }
