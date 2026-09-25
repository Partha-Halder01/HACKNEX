"""Live Earth Engine observations for a user-chosen AOI and date range.

Same method as the yearly batch pipeline (app.pipeline), scoped to one request:
  1. Train a Random Forest on stable CGMD mangrove / non-mangrove pixels
     (PIPELINE_TRAIN_YEARS) inside a training region around the AOI.
  2. Test it against the CGMD map of PIPELINE_TEST_YEAR (held out).
  3. Classify a cloud-masked Sentinel-2 composite for every observation window.
  4. Area per class, low-confidence area, gain/loss/uncertain masks (MMU + confidence).
  5. CGMD 1985–2018 areas as separate historical context; GEE tile URLs for the map.

All server round-trips go through `fetch` so tests can stub Earth Engine.
"""
import logging
from typing import Any, Callable, Dict, List, Optional

from ..core.config import settings
from ..geospatial.sentinel2 import SentinelProcessingError, build_sentinel_composite
from ..pipeline.metrics import (
    SQ_M_PER_HA,
    areas_from_grouped_sum,
    build_model_version,
    metrics_from_confusion_matrix,
    min_mapping_unit_pixels,
)
from .request import AnalysisRequest

logger = logging.getLogger("sundarban.analysis.gee")

DATA_SOURCE = "sentinel2_gee_random_forest_on_demand"
TRAIN_BUFFER_M = 5_000
MIN_SAMPLES_PER_CLASS = 30
TRAIN_SAMPLES_PER_CLASS = 300
TEST_SAMPLES_PER_CLASS = 200

CLASS_PALETTE = ["d9d2b6", "0b7a4b"]            # non-mangrove, mangrove
CHANGE_PALETTE = ["000000", "22c55e", "ef4444", "f59e0b"]  # none, gain, loss, uncertain


class GeeAnalysisError(RuntimeError):
    """User-facing failure of a live run (e.g. no cloud-free images in a window)."""


def _fetch(obj: Any) -> Any:
    return obj.getInfo()


def _composite(geometry: Any, start: str, end: str, steps: Any) -> Any:
    image, meta = build_sentinel_composite(geometry=geometry, start_date=start, end_date=end)
    return image.select(steps.FEATURES), meta


def _train(req: AnalysisRequest, fetch: Callable[[Any], Any], steps: Any) -> Dict[str, Any]:
    ee = steps._ee()
    point = ee.Geometry.Point([req.lon, req.lat])
    region = point.buffer(req.radius_km * 1000.0 + TRAIN_BUFFER_M)
    region_name = "AOI + 5 km"

    def build(region_geom: Any) -> Any:
        labels = steps.stable_reference_labels(
            settings.PIPELINE_TRAIN_YEARS, region_geom, settings.PIPELINE_EDGE_BUFFER_METERS
        )
        sets = []
        for year in settings.PIPELINE_TRAIN_YEARS:
            composite, _ = steps.annual_composite(year, region_geom)
            sets.append(
                steps.stratified_samples(
                    composite, labels, region_geom, TRAIN_SAMPLES_PER_CLASS, req.scale_m,
                    settings.PIPELINE_SEED + year,
                )
            )
        return steps.merge_samples(sets)

    samples = build(region)
    hist = fetch(samples.aggregate_histogram(steps.LABEL_BAND)) or {}
    counts = {int(float(k)): int(v) for k, v in hist.items()}
    if min(counts.get(0, 0), counts.get(1, 0)) < MIN_SAMPLES_PER_CLASS:
        # Too little mangrove (or non-mangrove) nearby to learn from: train on the
        # Gosaba pilot area instead, where both classes are well represented.
        from ..geospatial.aoi import convert_to_ee_geometry, load_pilot_aoi

        region = convert_to_ee_geometry(load_pilot_aoi())
        region_name = "Gosaba pilot AOI (fallback: too few local samples)"
        samples = build(region)
        hist = fetch(samples.aggregate_histogram(steps.LABEL_BAND)) or {}
        counts = {int(float(k)): int(v) for k, v in hist.items()}

    label_clf, prob_clf = steps.train_random_forest(samples, settings.PIPELINE_RF_TREES, settings.PIPELINE_SEED)
    signature = {
        "trainYears": sorted(settings.PIPELINE_TRAIN_YEARS),
        "samplesPerClass": TRAIN_SAMPLES_PER_CLASS,
        "trees": settings.PIPELINE_RF_TREES,
        "seed": settings.PIPELINE_SEED,
        "scale": req.scale_m,
        "reference": settings.CGMD_ASSET_ID,
        "region": region_name,
        "center": [round(req.lat, 3), round(req.lon, 3)],
        "features": steps.FEATURES,
    }
    return {
        "labelClf": label_clf,
        "probClf": prob_clf,
        "region": region,
        "info": {
            "trainingRegion": region_name,
            "trainYears": sorted(settings.PIPELINE_TRAIN_YEARS),
            "samplesByClass": {"Non-Mangrove": counts.get(0, 0), "Mangrove": counts.get(1, 0)},
            "trees": settings.PIPELINE_RF_TREES,
            "features": steps.FEATURES,
            "referenceAsset": settings.CGMD_ASSET_ID,
        },
        "modelVersion": build_model_version(signature, prefix="rf-gee-ondemand-v1"),
    }


def _accuracy(model: Dict[str, Any], req: AnalysisRequest, fetch: Callable, steps: Any) -> Optional[Dict[str, Any]]:
    year = settings.PIPELINE_TEST_YEAR
    try:
        composite, _ = steps.annual_composite(year, model["region"])
        classified = steps.classify(composite, model["labelClf"], model["probClf"])
        reference = steps.reference_labels(year, model["region"])
        cm = fetch(
            steps.confusion_matrix(
                classified, reference, model["region"], TEST_SAMPLES_PER_CLASS, req.scale_m, settings.PIPELINE_SEED
            )
        )
        acc = metrics_from_confusion_matrix(cm)
    except Exception as e:  # accuracy is reported as missing rather than failing the run
        logger.warning(f"[Analysis/GEE] Accuracy test failed: {e}")
        return None
    acc.update(
        {
            "testYear": year,
            "referenceSource": settings.CGMD_ASSET_ID,
            "region": model["info"]["trainingRegion"],
            "note": (
                f"Held-out test: {year} composite vs the {year} CGMD reference map (never used in training). "
                "Agreement with a 30 m reference, not field truth."
            ),
        }
    )
    return acc


def _historical(geometry: Any, fetch: Callable, steps: Any) -> Optional[List[Dict[str, Any]]]:
    ee = steps._ee()
    years = list(settings.CGMD_HISTORY_YEARS)
    if not years:
        return None
    try:
        # Same definition as the model's labels (CGMD canopy >= CGMD_MANGROVE_MIN_FCC %),
        # so the historical line and the Sentinel-2 line are comparable.
        bands = [
            steps.reference_labels(y, geometry).eq(1).multiply(ee.Image.pixelArea()).rename(f"y{y}")
            for y in years
        ]
        sums = fetch(
            ee.Image.cat(bands).reduceRegion(
                reducer=ee.Reducer.sum(), geometry=geometry, scale=settings.CGMD_SCALE_METERS,
                maxPixels=1e10, tileScale=4,
            )
        ) or {}
    except Exception as e:
        logger.warning(f"[Analysis/GEE] CGMD historical context unavailable: {e}")
        return None
    return [
        {"year": y, "mangroveHa": round(float(sums.get(f"y{y}") or 0.0) / SQ_M_PER_HA, 2)}
        for y in years
    ]


def _area_check(geometry: Any, timeline: List[Dict[str, Any]], fetch: Callable, steps: Any) -> Optional[Dict[str, Any]]:
    """Model vs CGMD mangrove area inside the AOI for the held-out test year.

    The sample-based accuracy uses equal numbers of each class, so it cannot show
    over-prediction in places with little mangrove (village trees and crops can look
    like mangrove). Comparing total areas for the AOI itself exposes that.
    """
    ee = steps._ee()
    year = settings.PIPELINE_TEST_YEAR
    row = next((r for r in timeline if r["key"] == f"y{year}"), None)
    if row is None:
        return None
    try:
        ref_m2 = fetch(
            ee.Image.pixelArea()
            .updateMask(steps.reference_labels(year, geometry).eq(1))
            .reduceRegion(reducer=ee.Reducer.sum(), geometry=geometry, scale=settings.CGMD_SCALE_METERS,
                          maxPixels=1e10, tileScale=4)
            .get("area")
        )
    except Exception as e:
        logger.warning(f"[Analysis/GEE] Area check failed: {e}")
        return None
    ref_ha = round(float(ref_m2 or 0.0) / SQ_M_PER_HA, 2)
    model_ha = row["mangroveHa"]
    diff = model_ha - ref_ha
    agrees = abs(diff) <= max(0.3 * ref_ha, 5.0)
    return {
        "year": year,
        "referenceHa": ref_ha,
        "modelHa": model_ha,
        "differenceHa": round(diff, 2),
        "differencePct": round(100.0 * diff / ref_ha, 1) if ref_ha > 0 else None,
        "agrees": agrees,
        "rule": "agrees if |model − reference| ≤ max(30 % of reference, 5 ha)",
    }


def _tile_url(image: Any, vis: Dict[str, Any]) -> Optional[str]:
    try:
        return image.getMapId(vis)["tile_fetcher"].url_format
    except Exception as e:
        logger.warning(f"[Analysis/GEE] Tile URL failed: {e}")
        return None


def observe(req: AnalysisRequest, fetch: Callable[[Any], Any] = _fetch, steps: Any = None) -> Dict[str, Any]:
    if steps is None:
        from ..pipeline import gee_steps as steps  # type: ignore[no-redef]
    ee = steps._ee()
    geometry = ee.Geometry.Point([req.lon, req.lat]).buffer(req.radius_km * 1000.0)
    threshold = settings.PIPELINE_CONFIDENCE_THRESHOLD

    model = _train(req, fetch, steps)
    accuracy = _accuracy(model, req, fetch, steps)

    timeline: List[Dict[str, Any]] = []
    classified: Dict[str, Any] = {}
    composites: Dict[str, Any] = {}
    notes: List[str] = []
    for period in req.periods():
        try:
            composite, meta = _composite(geometry, period["startDate"], period["endDate"], steps)
        except SentinelProcessingError as e:
            if period["key"] in ("start", "end"):
                raise GeeAnalysisError(
                    f"No usable Sentinel-2 images for the {period['key']} window "
                    f"({period['startDate']} → {period['endDate']}). Try a wider window or other dates."
                ) from e
            notes.append(f"Skipped {period['label']}: no cloud-free images.")
            continue
        image = steps.classify(composite, model["labelClf"], model["probClf"])
        stats = fetch(
            ee.Dictionary(
                {
                    "grouped": steps.grouped_area(image.select(steps.LABEL_BAND), geometry, req.scale_m),
                    "lowConf": steps.area_m2(image.select(steps.CONF_BAND).lt(threshold), geometry, req.scale_m),
                }
            )
        )
        areas = areas_from_grouped_sum(stats.get("grouped") or {})
        timeline.append(
            {
                **period,
                "mangroveHa": areas["Mangrove"],
                "nonMangroveHa": areas["Non-Mangrove"],
                "totalHa": areas["total"],
                "lowConfidenceHa": round(float(stats.get("lowConf") or 0.0) / SQ_M_PER_HA, 2),
                "imageCount": meta.get("imageCount"),
            }
        )
        classified[period["key"]] = image
        composites[period["key"]] = composite

    area_check = _area_check(geometry, timeline, fetch, steps)
    if area_check and not area_check["agrees"]:
        notes.append(
            f"Area check failed: the model maps {area_check['modelHa']} ha of mangrove here in "
            f"{area_check['year']}, the CGMD reference {area_check['referenceHa']} ha. Treat this area's "
            "numbers as unreliable (common where village trees or crops look like mangrove)."
        )
    if accuracy is not None:
        accuracy["areaCheck"] = area_check

    min_pixels = min_mapping_unit_pixels(settings.PIPELINE_MIN_MAPPING_UNIT_HA, req.scale_m)
    masks = steps.change_masks(classified["start"], classified["end"], min_pixels, threshold)
    ch = fetch(
        ee.Dictionary({k: steps.area_m2(masks[k], geometry, req.scale_m) for k in ("gain", "loss", "uncertain", "stable_mangrove")})
    ) or {}
    to_ha = lambda k: round(float(ch.get(k) or 0.0) / SQ_M_PER_HA, 2)  # noqa: E731

    change_img = (
        ee.Image(0)
        .where(masks["gain"], 1)
        .where(masks["loss"], 2)
        .where(masks["uncertain"], 3)
        .selfMask()
        .clip(geometry)
    )
    # Before/after photos cover the circle plus surrounding context (a square
    # ~3x the radius), so the comparison shows where the AOI sits in the landscape.
    from .basemap import TRUE_COLOR_VIS, true_color_composite

    periods = req.periods()
    context = ee.Geometry.Point([req.lon, req.lat]).buffer(max(req.radius_km * 3.0, req.radius_km + 4.0) * 1000.0).bounds()

    def _photo(period: Dict[str, Any], fallback: Any) -> Optional[str]:
        try:
            image = true_color_composite(context, period["startDate"], period["endDate"]).clip(context)
            return _tile_url(image, TRUE_COLOR_VIS)
        except Exception as e:  # fall back to the AOI-only composite
            logger.warning(f"[Analysis/GEE] Context photo failed: {e}")
            return _tile_url(fallback.clip(geometry), TRUE_COLOR_VIS)

    tiles = {
        "trueColorStart": _photo(periods[0], composites["start"]),
        "trueColorEnd": _photo(periods[-1], composites["end"]),
        "classStart": _tile_url(
            classified["start"].select(steps.LABEL_BAND).clip(geometry), {"min": 0, "max": 1, "palette": CLASS_PALETTE}
        ),
        "classEnd": _tile_url(
            classified["end"].select(steps.LABEL_BAND).clip(geometry), {"min": 0, "max": 1, "palette": CLASS_PALETTE}
        ),
        "change": _tile_url(change_img, {"min": 0, "max": 3, "palette": CHANGE_PALETTE}),
    }

    return {
        "dataSource": DATA_SOURCE,
        "isRealData": True,
        "modelVersion": model["modelVersion"],
        "engineNote": "Live Sentinel-2 composites classified by a Random Forest trained on CGMD reference labels.",
        "timeline": timeline,
        "change": {
            "gainHa": to_ha("gain"),
            "lossHa": to_ha("loss"),
            "uncertainHa": to_ha("uncertain"),
            "stableMangroveHa": to_ha("stable_mangrove"),
            "minMappingUnitHa": settings.PIPELINE_MIN_MAPPING_UNIT_HA,
            "confidenceThreshold": threshold,
        },
        "accuracy": accuracy,
        "historical": _historical(geometry, fetch, steps),
        "tiles": {k: v for k, v in tiles.items() if v},
        "training": model["info"],
        "notes": notes,
    }
