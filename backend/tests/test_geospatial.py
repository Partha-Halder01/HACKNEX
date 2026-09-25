"""Comprehensive tests for Geospatial, Google Earth Engine, Sentinel-2, and Indices."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.geospatial.aoi import (
    load_pilot_aoi,
    validate_geojson,
    validate_coordinates,
    validate_coordinate_pair,
    get_bounding_box,
    extract_geometry,
    GeoJSONValidationError,
)
from app.geospatial.indices import (
    compute_ndvi_scalar,
    compute_ndwi_scalar,
    INDICES_METADATA,
)
from app.geospatial.sentinel2 import (
    get_seasonal_date_range,
    SentinelProcessingError,
    REQUIRED_BANDS,
    BAND_METADATA,
)
from app.geospatial.gee_client import get_gee_status, initialize_gee
from app.core.config import settings

client = TestClient(app)


def test_gee_disabled_state():
    """Verify GEE disabled state behaves gracefully without attempting network auth."""
    status = get_gee_status()
    assert "enabled" in status
    assert "initialized" in status
    assert "statusCode" in status
    assert status["collectionId"] == "COPERNICUS/S2_SR_HARMONIZED"


def test_api_geospatial_status():
    """Test GET /api/geospatial/status endpoint."""
    response = client.get("/api/geospatial/status")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "initialized" in data
    assert "statusCode" in data
    assert "collectionId" in data
    assert "seasonalWindow" in data
    assert data["collectionId"] == "COPERNICUS/S2_SR_HARMONIZED"
    assert data["cloudThresholdPercent"] == 30


def test_pilot_aoi_loading_and_geojson_validity():
    """Verify loading of the Gosaba-Satjelia pilot AOI GeoJSON."""
    aoi_data = load_pilot_aoi()
    assert aoi_data["type"] == "FeatureCollection"
    assert len(aoi_data["features"]) > 0

    feature = aoi_data["features"][0]
    assert feature["type"] == "Feature"
    assert feature["geometry"]["type"] == "Polygon"

    # Validate coordinates
    coords = feature["geometry"]["coordinates"]
    assert len(coords[0]) >= 4  # Ring has at least 4 points

    # Check that first and last coordinate match (closed ring)
    assert coords[0][0] == coords[0][-1]

    # Check coordinate order: longitude ~88, latitude ~22
    for pt in coords[0]:
        lon, lat = pt[0], pt[1]
        assert 80.0 <= lon <= 95.0, f"Longitude {lon} out of expected Sundarban region"
        assert 20.0 <= lat <= 25.0, f"Latitude {lat} out of expected Sundarban region"


def test_validate_coordinate_pair():
    """Verify coordinate pair validation enforcing [longitude, latitude]."""
    # Valid coordinates
    lon, lat = validate_coordinate_pair([88.80, 22.15])
    assert lon == 88.80
    assert lat == 22.15

    # Out of bounds longitude
    with pytest.raises(GeoJSONValidationError, match="Longitude.*out of valid"):
        validate_coordinate_pair([200.0, 22.15])

    # Out of bounds latitude
    with pytest.raises(GeoJSONValidationError, match="Latitude.*out of valid"):
        validate_coordinate_pair([88.80, 100.0])

    # Non-numeric coordinate
    with pytest.raises(GeoJSONValidationError, match="Non-numeric"):
        validate_coordinate_pair(["invalid", "coord"])


def test_validate_geojson_invalid_structures():
    """Verify GeoJSON validation raises errors for invalid payloads."""
    with pytest.raises(GeoJSONValidationError, match="Missing required 'type'"):
        validate_geojson({"missing": "type"})

    with pytest.raises(GeoJSONValidationError, match="Unsupported GeoJSON type"):
        validate_geojson({"type": "InvalidType"})

    with pytest.raises(GeoJSONValidationError, match="Polygon ring.*is not closed"):
        validate_geojson({
            "type": "Polygon",
            "coordinates": [
                [[88.0, 22.0], [89.0, 22.0], [89.0, 23.0], [88.0, 22.5]]  # not closed
            ]
        })


def test_bounding_box_computation():
    """Verify bounding box computation."""
    poly = {
        "type": "Polygon",
        "coordinates": [
            [[88.1, 22.1], [88.9, 22.1], [88.9, 22.9], [88.1, 22.9], [88.1, 22.1]]
        ]
    }
    min_lon, min_lat, max_lon, max_lat = get_bounding_box(poly)
    assert min_lon == pytest.approx(88.1)
    assert min_lat == pytest.approx(22.1)
    assert max_lon == pytest.approx(88.9)
    assert max_lat == pytest.approx(22.9)


def test_ndvi_scalar_formula():
    """Test pure-Python NDVI scalar calculation."""
    # Standard healthy vegetation: high NIR, low Red
    ndvi_healthy = compute_ndvi_scalar(nir=0.8, red=0.1)
    assert ndvi_healthy == pytest.approx((0.8 - 0.1) / (0.8 + 0.1), rel=1e-3)
    assert 0.7 < ndvi_healthy < 0.8

    # Water / Non-vegetated: low NIR, higher Red
    ndvi_water = compute_ndvi_scalar(nir=0.05, red=0.15)
    assert ndvi_water < 0.0

    # Zero denominator protection
    assert compute_ndvi_scalar(0.0, 0.0) == 0.0

    # Range clamp
    assert compute_ndvi_scalar(2.0, -0.5) <= 1.0


def test_ndwi_scalar_formula():
    """Test pure-Python NDWI scalar calculation (McFeeters 1996)."""
    # Open water: high Green, low NIR
    ndwi_water = compute_ndwi_scalar(green=0.3, nir=0.05)
    assert ndwi_water == pytest.approx((0.3 - 0.05) / (0.3 + 0.05), rel=1e-3)
    assert ndwi_water > 0.5

    # Dense mangrove forest: high NIR, moderate Green
    ndwi_forest = compute_ndwi_scalar(green=0.2, nir=0.7)
    assert ndwi_forest < 0.0

    # Zero denominator protection
    assert compute_ndwi_scalar(0.0, 0.0) == 0.0


def test_indices_metadata():
    """Verify indices metadata formulas and disclaimers."""
    assert "NDVI" in INDICES_METADATA
    assert "NDWI" in INDICES_METADATA
    assert INDICES_METADATA["NDVI"]["formula"] == "(B8 - B4) / (B8 + B4)"
    assert INDICES_METADATA["NDWI"]["formula"] == "(B3 - B8) / (B3 + B8)"
    assert "carbon" in INDICES_METADATA["NDVI"]["scientific_disclaimer"].lower()


def test_seasonal_date_range_construction():
    """Verify seasonal date range formatting and validation."""
    start, end = get_seasonal_date_range(2025, 1, 1, 3, 31)
    assert start == "2025-01-01"
    assert end == "2025-03-31"

    # Inverted date range raises error
    with pytest.raises(SentinelProcessingError) as exc_info:
        get_seasonal_date_range(2025, 5, 1, 3, 1)
    assert exc_info.value.code == "INVALID_DATE_RANGE"


def test_required_sentinel_bands():
    """Verify all 6 required spectral bands and metadata exist."""
    assert set(REQUIRED_BANDS) == {"B2", "B3", "B4", "B8", "B11", "B12"}
    for band in REQUIRED_BANDS:
        assert band in BAND_METADATA
        assert BAND_METADATA[band]["native_res_m"] in (10, 20)


def test_api_geospatial_observations_demo_fallback():
    """Test GET /api/geospatial/observations returns properly labeled fallback data."""
    response = client.get("/api/geospatial/observations?village_id=gosaba&year=2025")
    assert response.status_code == 200
    data = response.json()

    assert data["villageId"] == "gosaba"
    assert data["year"] == 2025
    assert data["source"] == "Sentinel-2"
    assert data["platform"] == "Google Earth Engine"
    assert data["collection"] == "COPERNICUS/S2_SR_HARMONIZED"

    # Integrity check: Fallback MUST be explicitly labeled
    assert data["dataSource"] == "demo_fallback"
    assert data["isRealData"] is False

    # Check bands
    for band in ["B2", "B3", "B4", "B8", "B11", "B12"]:
        assert band in data["bands"]
        b_stats = data["bands"][band]
        assert "mean" in b_stats
        assert "median" in b_stats

    # Check indices
    assert "NDVI" in data["indices"]
    assert "NDWI" in data["indices"]
    assert data["indices"]["NDVI"]["mean"] > 0.0

    # Check processing metadata
    assert data["processing"]["compositeMethod"] == "median"
    assert data["processing"]["resolutionMeters"] == 20


def test_api_geospatial_indices():
    """Test GET /api/geospatial/indices endpoint returns scientific metadata."""
    response = client.get("/api/geospatial/indices?village_id=satjelia&year=2025")
    assert response.status_code == 200
    data = response.json()

    assert data["villageId"] == "satjelia"
    assert data["year"] == 2025
    assert "ndvi" in data
    assert "ndwi" in data

    # NDVI details
    ndvi = data["ndvi"]
    assert ndvi["name"] == "Normalized Difference Vegetation Index"
    assert ndvi["formula"] == "(B8 - B4) / (B8 + B4)"
    assert ndvi["bands"]["nir"] == "B8"
    assert ndvi["bands"]["red"] == "B4"
    assert "statistics" in ndvi
    assert "interpretation" in ndvi

    # NDWI details
    ndwi = data["ndwi"]
    assert "McFeeters" in ndwi["name"]
    assert ndwi["formula"] == "(B3 - B8) / (B3 + B8)"
    assert ndwi["bands"]["green"] == "B3"
    assert ndwi["bands"]["nir"] == "B8"


def test_api_geospatial_preview_geojson():
    """Test GET /api/geospatial/preview returns valid GeoJSON FeatureCollection."""
    response = client.get("/api/geospatial/preview?village_id=gosaba&year=2025")
    assert response.status_code == 200
    data = response.json()

    assert data["villageId"] == "gosaba"
    assert data["year"] == 2025
    assert "geojson" in data

    geojson = data["geojson"]
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) == 1

    feature = geojson["features"][0]
    assert feature["type"] == "Feature"
    assert feature["properties"]["villageId"] == "gosaba"
    assert feature["properties"]["dataSource"] == "demo_fallback"
    assert feature["properties"]["isRealData"] is False
    assert feature["geometry"]["type"] == "Polygon"


def test_api_year_validation_boundaries():
    """Verify validation for out-of-range years."""
    # Year before 2015 should fail validation
    res_early = client.get("/api/geospatial/observations?village_id=gosaba&year=2010")
    assert res_early.status_code == 422

    # Year after 2030 should fail validation
    res_future = client.get("/api/geospatial/observations?village_id=gosaba&year=2050")
    assert res_future.status_code == 422


@pytest.mark.integration
def test_live_gee_connection():
    """Optional live integration test for GEE. Skipped unless live GEE is configured."""
    if not settings.GEE_ENABLED:
        pytest.skip("GEE_ENABLED is false; skipping live GEE integration test.")

    is_init, status_code, err_msg = initialize_gee()
    if not is_init:
        pytest.skip(f"Live GEE authentication not configured: {status_code} ({err_msg})")

    import ee
    aoi_geojson = load_pilot_aoi()
    coords = aoi_geojson["features"][0]["geometry"]["coordinates"]
    ee_geom = ee.Geometry.Polygon(coords)

    collection = (
        ee.ImageCollection(settings.SENTINEL_COLLECTION)
        .filterBounds(ee_geom)
        .filterDate("2025-01-01", "2025-03-31")
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", settings.SENTINEL_CLOUD_PERCENT))
    )

    count = int(collection.size().getInfo())
    assert count >= 0
