"""Geospatial processing package for MangroveLens."""
from .gee_client import initialize_gee, get_gee_status
from .aoi import (
    load_geojson,
    validate_geojson,
    validate_coordinates,
    extract_geometry,
    convert_to_ee_geometry,
    load_pilot_aoi,
)
from .indices import (
    calculate_ndvi,
    calculate_ndwi,
    compute_ndvi_scalar,
    compute_ndwi_scalar,
    INDICES_METADATA,
)
from .preprocessing import mask_s2_sr_clouds
from .sentinel2 import (
    load_sentinel_collection,
    build_sentinel_composite,
    extract_zonal_statistics,
    REQUIRED_BANDS,
    BAND_METADATA,
)

__all__ = [
    "initialize_gee",
    "get_gee_status",
    "load_geojson",
    "validate_geojson",
    "validate_coordinates",
    "extract_geometry",
    "convert_to_ee_geometry",
    "load_pilot_aoi",
    "calculate_ndvi",
    "calculate_ndwi",
    "compute_ndvi_scalar",
    "compute_ndwi_scalar",
    "INDICES_METADATA",
    "mask_s2_sr_clouds",
    "load_sentinel_collection",
    "build_sentinel_composite",
    "extract_zonal_statistics",
    "REQUIRED_BANDS",
    "BAND_METADATA",
]
