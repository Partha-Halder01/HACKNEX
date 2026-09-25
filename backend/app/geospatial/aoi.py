"""Area of Interest (AOI) management, validation, and GeoJSON conversion.

Coordinates MUST ALWAYS follow GeoJSON WGS84 standard: [longitude, latitude].
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("sundarban.geospatial.aoi")


class GeoJSONValidationError(ValueError):
    """Raised when GeoJSON structure or coordinates are invalid."""
    pass


def validate_coordinate_pair(coord: Any) -> Tuple[float, float]:
    """Validate a single coordinate pair ensuring [longitude, latitude] bounds."""
    if not isinstance(coord, (list, tuple)) or len(coord) < 2:
        raise GeoJSONValidationError(
            f"Invalid coordinate format: expected [longitude, latitude], got {coord}"
        )
    try:
        lon = float(coord[0])
        lat = float(coord[1])
    except (ValueError, TypeError) as e:
        raise GeoJSONValidationError(
            f"Non-numeric coordinates encountered: {coord}"
        ) from e

    if not (-180.0 <= lon <= 180.0):
        raise GeoJSONValidationError(
            f"Longitude {lon} out of valid WGS84 bounds [-180, 180]. "
            f"Ensure coordinate order is [longitude, latitude]."
        )
    if not (-90.0 <= lat <= 90.0):
        raise GeoJSONValidationError(
            f"Latitude {lat} out of valid WGS84 bounds [-90, 90]. "
            f"Ensure coordinate order is [longitude, latitude]."
        )
    return lon, lat


def validate_coordinates(coordinates: Any, geom_type: str) -> List[Any]:
    """Recursively validate GeoJSON coordinate arrays for Polygon or MultiPolygon."""
    if geom_type == "Polygon":
        if not isinstance(coordinates, list) or len(coordinates) == 0:
            raise GeoJSONValidationError("Polygon coordinates must be a non-empty list of linear rings.")
        for ring_idx, ring in enumerate(coordinates):
            if not isinstance(ring, list) or len(ring) < 4:
                raise GeoJSONValidationError(
                    f"Polygon ring {ring_idx} must contain at least 4 coordinate pairs (first and last matching)."
                )
            for coord in ring:
                validate_coordinate_pair(coord)
            # Check closure (first and last coordinate approximately identical)
            first_lon, first_lat = ring[0][0], ring[0][1]
            last_lon, last_lat = ring[-1][0], ring[-1][1]
            if abs(first_lon - last_lon) > 1e-6 or abs(first_lat - last_lat) > 1e-6:
                raise GeoJSONValidationError(
                    f"Polygon ring {ring_idx} is not closed: first {ring[0]} != last {ring[-1]}"
                )
    elif geom_type == "MultiPolygon":
        if not isinstance(coordinates, list) or len(coordinates) == 0:
            raise GeoJSONValidationError("MultiPolygon coordinates must be a non-empty list of polygons.")
        for poly_idx, poly_coords in enumerate(coordinates):
            validate_coordinates(poly_coords, "Polygon")
    elif geom_type == "Point":
        validate_coordinate_pair(coordinates)
    else:
        raise GeoJSONValidationError(f"Unsupported geometry type for AOI: {geom_type}")

    return coordinates


def validate_geojson(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a GeoJSON object (FeatureCollection, Feature, or Geometry)."""
    if not isinstance(data, dict):
        raise GeoJSONValidationError(f"Expected GeoJSON dict, got {type(data)}")

    geojson_type = data.get("type")
    if not geojson_type:
        raise GeoJSONValidationError("Missing required 'type' field in GeoJSON.")

    if geojson_type == "FeatureCollection":
        features = data.get("features")
        if not isinstance(features, list) or len(features) == 0:
            raise GeoJSONValidationError("FeatureCollection must contain a non-empty 'features' list.")
        for idx, feat in enumerate(features):
            if not isinstance(feat, dict) or feat.get("type") != "Feature":
                raise GeoJSONValidationError(f"FeatureCollection item {idx} is not a valid Feature.")
            geom = feat.get("geometry")
            if not isinstance(geom, dict):
                raise GeoJSONValidationError(f"Feature {idx} is missing a valid 'geometry' object.")
            geom_type = geom.get("type")
            coords = geom.get("coordinates")
            validate_coordinates(coords, geom_type)

    elif geojson_type == "Feature":
        geom = data.get("geometry")
        if not isinstance(geom, dict):
            raise GeoJSONValidationError("Feature is missing a valid 'geometry' object.")
        geom_type = geom.get("type")
        coords = geom.get("coordinates")
        validate_coordinates(coords, geom_type)

    elif geojson_type in ("Polygon", "MultiPolygon", "Point"):
        coords = data.get("coordinates")
        validate_coordinates(coords, geojson_type)

    else:
        raise GeoJSONValidationError(f"Unsupported GeoJSON type: '{geojson_type}'")

    return data


def extract_geometry(geojson_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract standard GeoJSON geometry dictionary from FeatureCollection, Feature, or Geometry."""
    validate_geojson(geojson_data)
    geojson_type = geojson_data.get("type")

    if geojson_type == "FeatureCollection":
        # Return geometry of the primary feature
        first_feature = geojson_data["features"][0]
        return first_feature["geometry"]
    elif geojson_type == "Feature":
        return geojson_data["geometry"]
    elif geojson_type in ("Polygon", "MultiPolygon", "Point"):
        return geojson_data
    raise GeoJSONValidationError(f"Could not extract geometry from GeoJSON type: {geojson_type}")


def get_bounding_box(geometry: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Compute [min_lon, min_lat, max_lon, max_lat] for a valid geometry."""
    geom = extract_geometry(geometry) if geometry.get("type") != "Polygon" else geometry
    coords = geom.get("coordinates", [])

    all_points: List[Tuple[float, float]] = []

    def _collect_points(arr: Any) -> None:
        if isinstance(arr, list) and len(arr) >= 2 and isinstance(arr[0], (int, float)):
            all_points.append((float(arr[0]), float(arr[1])))
        elif isinstance(arr, list):
            for sub in arr:
                _collect_points(sub)

    _collect_points(coords)

    if not all_points:
        raise GeoJSONValidationError("No coordinate points found to calculate bounding box.")

    lons = [p[0] for p in all_points]
    lats = [p[1] for p in all_points]
    return (min(lons), min(lats), max(lons), max(lats))


def load_geojson(file_path_or_dict: Union[str, Path, Dict[str, Any]]) -> Dict[str, Any]:
    """Load and validate GeoJSON from file path or dictionary."""
    if isinstance(file_path_or_dict, dict):
        return validate_geojson(file_path_or_dict)

    path = Path(file_path_or_dict)
    if not path.is_absolute():
        # Try resolving relative to backend directory or workspace
        candidates = [
            Path.cwd() / path,
            Path(__file__).resolve().parent.parent.parent / path,
            Path(__file__).resolve().parent.parent.parent.parent / path,
        ]
        resolved = None
        for cand in candidates:
            if cand.exists():
                resolved = cand
                break
        if resolved:
            path = resolved

    if not path.exists():
        raise FileNotFoundError(f"GeoJSON file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return validate_geojson(data)


def load_pilot_aoi(aoi_path: Optional[str] = None) -> Dict[str, Any]:
    """Load the default Sundarban pilot Area of Interest."""
    if not aoi_path:
        from app.core.config import settings
        aoi_path = settings.SUNDARBAN_AOI_PATH

    try:
        return load_geojson(aoi_path)
    except FileNotFoundError:
        # Fallback to absolute relative to package
        default_path = Path(__file__).resolve().parent.parent.parent / "data" / "aoi" / "sundarban_pilot.geojson"
        return load_geojson(default_path)


def convert_to_ee_geometry(geojson_data: Dict[str, Any]) -> Any:
    """Convert a GeoJSON geometry or FeatureCollection into an Earth Engine ee.Geometry object."""
    try:
        import ee
    except ImportError as e:
        raise RuntimeError("earthengine-api is not installed.") from e

    geom_dict = extract_geometry(geojson_data)
    geom_type = geom_dict.get("type")
    coords = geom_dict.get("coordinates")

    if geom_type == "Polygon":
        return ee.Geometry.Polygon(coords, proj="EPSG:4326", geodesic=True)
    elif geom_type == "MultiPolygon":
        return ee.Geometry.MultiPolygon(coords, proj="EPSG:4326", geodesic=True)
    elif geom_type == "Point":
        return ee.Geometry.Point(coords, proj="EPSG:4326")
    else:
        raise GeoJSONValidationError(f"Cannot convert geometry type '{geom_type}' to ee.Geometry.")
