"""Spectral index calculations for vegetation and water delineation.

Formulas:
- NDVI = (B8 - B4) / (B8 + B4)  [NIR and Red]
- NDWI = (B3 - B8) / (B3 + B8)  [Green and NIR - McFeeters 1996]

IMPORTANT SCIENTIFIC NOTE:
NDVI and NDWI are biophysical indicators of photosynthetic canopy health and water body
boundaries. They are NOT direct carbon stock measurements.
"""
from typing import Any, Dict, Optional


INDICES_METADATA: Dict[str, Dict[str, Any]] = {
    "NDVI": {
        "name": "Normalized Difference Vegetation Index",
        "formula": "(B8 - B4) / (B8 + B4)",
        "bands": {"nir": "B8", "red": "B4"},
        "range": [-1.0, 1.0],
        "interpretation": "Canopy greenness, leaf area index proxy, and photosynthetic vigor.",
        "scientific_disclaimer": "Indicator only; does not directly measure biomass or carbon tonnage.",
    },
    "NDWI": {
        "name": "Normalized Difference Water Index (McFeeters 1996)",
        "formula": "(B3 - B8) / (B3 + B8)",
        "bands": {"green": "B3", "nir": "B8"},
        "range": [-1.0, 1.0],
        "interpretation": "Open water surface delineation and tidal inundation boundary mapping.",
        "scientific_disclaimer": "Uses McFeeters 1996 (Green-NIR). Distinct from Gao (NIR-SWIR) or Xu (MNDWI).",
    },
}


def calculate_ndvi(image: Any) -> Any:
    """Calculate NDVI on an Earth Engine ee.Image using B8 (NIR) and B4 (Red).

    Formula: (B8 - B4) / (B8 + B4)
    """
    try:
        import ee
    except ImportError:
        return image

    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    return image.addBands(ndvi)


def calculate_ndwi(image: Any) -> Any:
    """Calculate NDWI (McFeeters 1996) on an Earth Engine ee.Image using B3 (Green) and B8 (NIR).

    Formula: (B3 - B8) / (B3 + B8)
    """
    try:
        import ee
    except ImportError:
        return image

    ndwi = image.normalizedDifference(["B3", "B8"]).rename("NDWI")
    return image.addBands(ndwi)


def compute_ndvi_scalar(nir: float, red: float) -> float:
    """Compute pure-Python NDVI scalar with numerical safety."""
    denominator = nir + red
    if abs(denominator) < 1e-7:
        return 0.0
    val = (nir - red) / denominator
    return max(-1.0, min(1.0, val))


def compute_ndwi_scalar(green: float, nir: float) -> float:
    """Compute pure-Python NDWI scalar (McFeeters 1996) with numerical safety."""
    denominator = green + nir
    if abs(denominator) < 1e-7:
        return 0.0
    val = (green - nir) / denominator
    return max(-1.0, min(1.0, val))
