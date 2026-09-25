"""Sentinel-2 Surface Reflectance cloud and shadow masking routines.

Uses the Scene Classification Layer (SCL) and QA60 band to mask out cloud pixels,
cloud shadows, and cirrus artifacts over coastal mangrove and estuarine zones.
"""
import logging
from typing import Any

logger = logging.getLogger("sundarban.geospatial.preprocessing")


def mask_s2_sr_clouds(image: Any) -> Any:
    """Mask clouds, cloud shadows, and cirrus on a Sentinel-2 Surface Reflectance image.

    Primary Mask: Scene Classification Layer (SCL)
    - Value 3: Cloud shadow
    - Value 8: Cloud medium probability
    - Value 9: Cloud high probability
    - Value 10: Thin cirrus
    - Value 11: Snow / Ice

    Secondary Mask: QA60 Band (where present)
    - Bit 10: Opaque clouds
    - Bit 11: Cirrus clouds

    Preserved classes:
    - Value 4: Vegetation (mangroves, forest, crops)
    - Value 5: Bare soils / intertidal mudflats
    - Value 6: Water (creeks, rivers, estuaries, bay)
    - Value 2: Dark area pixels
    - Value 7: Unclassified

    Returns:
        ee.Image with masked cloud and shadow pixels.
    """
    try:
        import ee
    except ImportError:
        return image

    band_names = image.bandNames()

    # Check if SCL band is available
    has_scl = band_names.contains("SCL")
    has_qa60 = band_names.contains("QA60")

    # Construct SCL mask
    # We want pixels NOT equal to 3, 8, 9, 10, 11
    scl = image.select("SCL")
    scl_mask = (
        scl.neq(3)   # Cloud shadow
        .And(scl.neq(8))  # Cloud medium probability
        .And(scl.neq(9))  # Cloud high probability
        .And(scl.neq(10)) # Thin cirrus
        .And(scl.neq(11)) # Snow/Ice
    )

    # Construct QA60 mask
    qa60 = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    qa_mask = (
        qa60.bitwiseAnd(cloud_bit_mask).eq(0)
        .And(qa60.bitwiseAnd(cirrus_bit_mask).eq(0))
    )

    # Combine masks safely using ee.Algorithms.If for band availability
    combined_mask = ee.Algorithms.If(
        has_scl,
        ee.Algorithms.If(has_qa60, scl_mask.And(qa_mask), scl_mask),
        ee.Algorithms.If(has_qa60, qa_mask, ee.Image(1))
    )

    return image.updateMask(ee.Image(combined_mask))
