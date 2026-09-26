"""Authoritative land-cover class definitions for MangroveLens.

Exactly five discrete classes are supported:
0 = Mangrove
1 = Water
2 = Aquaculture
3 = Bare Land
4 = Other Vegetation
"""
from typing import Any, Dict, List, Optional

LAND_COVER_CLASSES: Dict[int, str] = {
    0: "Mangrove",
    1: "Water",
    2: "Aquaculture",
    3: "Bare Land",
    4: "Other Vegetation",
}

CLASS_NAMES: List[str] = [
    "Mangrove",
    "Water",
    "Aquaculture",
    "Bare Land",
    "Other Vegetation",
]

CLASS_DEFINITIONS: Dict[int, Dict[str, Any]] = {
    0: {
        "id": 0,
        "name": "Mangrove",
        "color": "#16845f",
        "fillColor": "#16845f",
        "description": "Dense tidal mangrove canopy (Avicennia, Rhizophora, Ceriops, Sonneratia).",
        "spectral_signature": "High NIR (B8), strong Red absorption (B4), high positive NDVI (>0.65).",
    },
    1: {
        "id": 1,
        "name": "Water",
        "color": "#3896d8",
        "fillColor": "#3896d8",
        "description": "Open estuarine rivers, tidal creeks, Bay of Bengal delta waterways.",
        "spectral_signature": "High Blue (B2), strong NIR/SWIR absorption, high positive NDWI (>0.40).",
    },
    2: {
        "id": 2,
        "name": "Aquaculture",
        "color": "#f05d57",
        "fillColor": "#f05d57",
        "description": "Brackish water shrimp ponds (bheri), bounded aquaculture excavations.",
        "spectral_signature": "Turbid water with earthen perimeter dyke signature, moderate NDWI (0.0 to 0.2).",
    },
    3: {
        "id": 3,
        "name": "Bare Land",
        "color": "#b98d64",
        "fillColor": "#b98d64",
        "description": "Exposed intertidal mudflats, riverbank embankments, unpaved dykes, barren soil.",
        "spectral_signature": "High SWIR (B11/B12), flat visible reflectance, low positive NDVI (<0.15).",
    },
    4: {
        "id": 4,
        "name": "Other Vegetation",
        "color": "#9acb55",
        "fillColor": "#9acb55",
        "description": "Village homestead gardens, coconut/betel palm plantations, non-mangrove crops.",
        "spectral_signature": "Moderate NIR (B8), moderate SWIR moisture absorption, moderate NDVI (0.40 to 0.60).",
    },
}


def get_class_name(class_id: int) -> str:
    """Retrieve canonical class name for a given class ID."""
    if class_id not in LAND_COVER_CLASSES:
        raise ValueError(f"Invalid class ID: {class_id}. Must be one of {list(LAND_COVER_CLASSES.keys())}.")
    return LAND_COVER_CLASSES[class_id]


def get_class_id(class_name: str) -> int:
    """Retrieve canonical class ID for a given class name."""
    clean_name = class_name.strip().title()
    for cid, name in LAND_COVER_CLASSES.items():
        if name.lower() == clean_name.lower():
            return cid
    raise ValueError(f"Invalid class name: '{class_name}'. Must be one of {CLASS_NAMES}.")


def validate_class_id(class_id: Any) -> int:
    """Validate that class_id is an integer between 0 and 4."""
    try:
        cid = int(class_id)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Class ID must be integer, got {class_id}") from e
    if cid not in LAND_COVER_CLASSES:
        raise ValueError(f"Class ID {cid} is out of bounds. Expected 0..4.")
    return cid
