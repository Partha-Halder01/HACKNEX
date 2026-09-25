"""Thin Earth Engine wrappers for the Random Forest pipeline.

Every function here builds server-side ee objects and returns them; nothing is
fetched until the runner calls `.getInfo()`. Keep this module free of maths so
it can be swapped or mocked without touching the testable parts.
"""
import logging
from typing import Any, Dict, List, Sequence, Tuple

from ..geospatial.sentinel2 import (
    REQUIRED_BANDS,
    build_sentinel_composite,
    get_seasonal_date_range,
)
from .metrics import MANGROVE, NON_MANGROVE

logger = logging.getLogger("sundarban.pipeline.gee")

FEATURES: List[str] = REQUIRED_BANDS + ["NDVI", "NDWI"]
LABEL_BAND = "label"
PROB_BAND = "mangrove_prob"
CONF_BAND = "confidence"


def _ee():
    try:
        import ee  # noqa: WPS433
    except ImportError as e:  # pragma: no cover - exercised only without the package
        raise RuntimeError("earthengine-api is not installed.") from e
    return ee


# --------------------------------------------------------------------------- #
# Inputs
# --------------------------------------------------------------------------- #
def annual_composite(year: int, geometry: Any) -> Tuple[Any, Dict[str, Any]]:
    """Cloud-masked seasonal median composite with NDVI/NDWI for one year."""
    start, end = get_seasonal_date_range(year)
    image, meta = build_sentinel_composite(geometry=geometry, start_date=start, end_date=end)
    return image.select(FEATURES), meta


def _reference_raw(year: int, geometry: Any) -> Any:
    """The CGMD label band for `year`, mosaicked over the tiles that touch `geometry`."""
    ee = _ee()
    from ..core.config import settings

    if settings.CGMD_ASSET_TYPE == "collection":
        col = (
            ee.ImageCollection(settings.CGMD_ASSET_ID)
            .filter(ee.Filter.eq(settings.CGMD_YEAR_PROPERTY, year))
            .filterBounds(geometry)
        )
        # The asset is split into regional tiles; mosaic them rather than taking .first().
        return col.mosaic().select(settings.CGMD_LABEL_BAND)
    band = settings.CGMD_BAND_PATTERN.format(year=year)
    return ee.Image(settings.CGMD_ASSET_ID).select(band)


def reference_labels(year: int, geometry: Any) -> Any:
    """Reference label image for `year` from CGMD: 1 = mangrove, 0 = non-mangrove.

    "fraction" mode (CGMD-AFCC30, band = canopy cover %): pixels with at least
    CGMD_MANGROVE_MIN_FCC % cover are mangrove, masked / near-zero pixels are
    non-mangrove, and mixed pixels in between are masked so they are never used
    as training or test labels. "binary" mode compares with CGMD_MANGROVE_VALUE.
    """
    ee = _ee()
    from ..core.config import settings

    raw = _reference_raw(year, geometry)
    if settings.CGMD_VALUE_MODE == "fraction":
        fcc = raw.unmask(0)  # masked = no mangrove
        mangrove = fcc.gte(settings.CGMD_MANGROVE_MIN_FCC)
        non_mangrove = fcc.lte(settings.CGMD_NON_MANGROVE_MAX_FCC)
        labels = (
            ee.Image(NON_MANGROVE).where(mangrove, MANGROVE).updateMask(mangrove.Or(non_mangrove))
        )
        return labels.rename(LABEL_BAND).toInt8().clip(geometry)

    mangrove = raw.eq(settings.CGMD_MANGROVE_VALUE)
    # unmask(0): nodata is treated as non-mangrove
    return mangrove.unmask(0).rename(LABEL_BAND).toInt8().clip(geometry)


def reference_canopy_fraction(year: int, geometry: Any) -> Any:
    """Mangrove canopy fraction 0-1 per pixel for `year` (binary mode: 0 or 1)."""
    from ..core.config import settings

    raw = _reference_raw(year, geometry)
    if settings.CGMD_VALUE_MODE == "fraction":
        return raw.unmask(0).divide(100.0).clamp(0, 1).clip(geometry)
    return raw.eq(settings.CGMD_MANGROVE_VALUE).unmask(0).clip(geometry)


def stable_reference_labels(years: Sequence[int], geometry: Any, edge_buffer_m: int) -> Any:
    """Labels for pixels that had the same clear class in every one of `years`, edges eroded.

    Only these pixels are trusted for training: a pixel that flipped between
    years (or was mixed in any year) may reflect CGMD's own errors or real
    change, and either way it is a poor teacher. Erosion removes 30 m boundary pixels.
    """
    ee = _ee()
    stack = ee.ImageCollection([reference_labels(y, geometry) for y in years])
    labelled_every_year = stack.count().eq(len(years))
    always_mangrove = stack.reduce(ee.Reducer.min()).eq(1).And(labelled_every_year).unmask(0)
    never_mangrove = stack.reduce(ee.Reducer.max()).eq(0).And(labelled_every_year).unmask(0)

    if edge_buffer_m > 0:
        always_mangrove = always_mangrove.focal_min(radius=edge_buffer_m, units="meters")
        never_mangrove = never_mangrove.focal_min(radius=edge_buffer_m, units="meters")

    labels = (
        ee.Image(NON_MANGROVE)
        .where(always_mangrove, MANGROVE)
        .updateMask(always_mangrove.Or(never_mangrove))
        .rename(LABEL_BAND)
        .toInt8()
    )
    return labels.clip(geometry)


# --------------------------------------------------------------------------- #
# Sampling, training, classification
# --------------------------------------------------------------------------- #
def stratified_samples(
    composite: Any, labels: Any, geometry: Any, per_class: int, scale: int, seed: int
) -> Any:
    """Balanced sample of feature vectors + label from one composite/label pair."""
    return composite.addBands(labels).stratifiedSample(
        numPoints=per_class,
        classBand=LABEL_BAND,
        region=geometry,
        scale=scale,
        seed=seed,
        geometries=False,
        tileScale=4,
    )


def merge_samples(sample_sets: Sequence[Any]) -> Any:
    ee = _ee()
    merged = ee.FeatureCollection(sample_sets[0])
    for extra in sample_sets[1:]:
        merged = merged.merge(extra)
    return merged


def train_random_forest(samples: Any, n_trees: int, seed: int) -> Tuple[Any, Any]:
    """Return (label classifier, probability classifier) trained on `samples`.

    Same seed and data → identical forests; the second only differs in output mode.
    """
    ee = _ee()
    base = ee.Classifier.smileRandomForest(numberOfTrees=n_trees, seed=seed)
    label_clf = base.train(features=samples, classProperty=LABEL_BAND, inputProperties=FEATURES)
    prob_clf = base.setOutputMode("MULTIPROBABILITY").train(
        features=samples, classProperty=LABEL_BAND, inputProperties=FEATURES
    )
    return label_clf, prob_clf


def classify(composite: Any, label_clf: Any, prob_clf: Any) -> Any:
    """Image with bands: label (0/1), mangrove_prob, confidence (= max class probability)."""
    ee = _ee()
    label = composite.classify(label_clf).rename(LABEL_BAND).toInt8()
    probs = composite.classify(prob_clf)  # array image ordered by classes seen: [0, 1]
    mangrove_prob = probs.arrayGet([MANGROVE]).rename(PROB_BAND)
    confidence = probs.arrayReduce(ee.Reducer.max(), [0]).arrayGet([0]).rename(CONF_BAND)
    return label.addBands(mangrove_prob).addBands(confidence)


def confusion_matrix(
    classified: Any, reference: Any, geometry: Any, per_class: int, scale: int, seed: int
) -> Any:
    """ee.ConfusionMatrix of `classified` against independent `reference` labels."""
    test = classified.select(LABEL_BAND).rename("predicted").addBands(reference).stratifiedSample(
        numPoints=per_class,
        classBand=LABEL_BAND,
        region=geometry,
        scale=scale,
        seed=seed + 1,  # distinct from training draw
        geometries=False,
        tileScale=4,
    )
    return test.errorMatrix(LABEL_BAND, "predicted")


# --------------------------------------------------------------------------- #
# Area and change
# --------------------------------------------------------------------------- #
def grouped_area(mask_or_label: Any, geometry: Any, scale: int) -> Any:
    """Sum of pixel area (m²) grouped by the image's first band value."""
    ee = _ee()
    return ee.Image.pixelArea().addBands(mask_or_label).reduceRegion(
        reducer=ee.Reducer.sum().group(groupField=1, groupName=LABEL_BAND),
        geometry=geometry,
        scale=scale,
        maxPixels=1e10,
        tileScale=8,
    )


def area_m2(mask: Any, geometry: Any, scale: int) -> Any:
    """Total area (m²) of the 1-pixels in a 0/1 mask, as an ee.Number."""
    ee = _ee()
    return ee.Number(
        ee.Image.pixelArea()
        .updateMask(mask)
        .reduceRegion(reducer=ee.Reducer.sum(), geometry=geometry, scale=scale, maxPixels=1e10, tileScale=8)
        .get("area")
    )


def change_masks(
    classified_from: Any,
    classified_to: Any,
    min_pixels: int,
    confidence_threshold: float,
) -> Dict[str, Any]:
    """Gain / loss / uncertain masks between two classified images.

    - gain: non-mangrove → mangrove, loss: mangrove → non-mangrove
    - patches smaller than `min_pixels` are dropped (minimum mapping unit)
    - a change pixel whose confidence is below the threshold in either year is
      reported separately as "uncertain" rather than counted as change
    """
    m_from = classified_from.select(LABEL_BAND).eq(MANGROVE)
    m_to = classified_to.select(LABEL_BAND).eq(MANGROVE)
    confident = (
        classified_from.select(CONF_BAND).gte(confidence_threshold)
        .And(classified_to.select(CONF_BAND).gte(confidence_threshold))
    )

    # connectedPixelCount only has to count up to the MMU; counting further (the old
    # maxSize=1024) costs memory and exceeded Earth Engine's per-user limit.
    max_size = int(min(1024, max(2, min_pixels)))

    def _mmu(mask: Any) -> Any:
        patch = mask.selfMask().connectedPixelCount(maxSize=max_size, eightConnected=True)
        return patch.gte(min_pixels).unmask(0)

    raw_gain = m_from.Not().And(m_to)
    raw_loss = m_from.And(m_to.Not())
    gain = _mmu(raw_gain.And(confident))
    loss = _mmu(raw_loss.And(confident))
    uncertain = _mmu(raw_gain.Or(raw_loss).And(confident.Not()))
    stable = m_from.And(m_to)

    return {"gain": gain, "loss": loss, "uncertain": uncertain, "stable_mangrove": stable}


def export_to_asset(image: Any, asset_id: str, geometry: Any, scale: int, description: str) -> Any:
    """Start (and return) an export task so large rasters are computed in the background."""
    ee = _ee()
    task = ee.batch.Export.image.toAsset(
        image=image,
        description=description,
        assetId=asset_id,
        region=geometry,
        scale=scale,
        maxPixels=1e10,
    )
    task.start()
    logger.info(f"[Pipeline] Started export task {task.id} -> {asset_id}")
    return task
