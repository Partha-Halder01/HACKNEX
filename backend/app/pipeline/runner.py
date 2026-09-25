"""Pipeline orchestration: train → test → predict → areas → change → JSON result.

Run once per year (or whenever the model changes) via scripts/run_gee_pipeline.py.
The API layer reads the saved JSON; it never calls Earth Engine per request.
"""
import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence

from .metrics import (
    BINARY_CLASSES,
    areas_from_grouped_sum,
    build_model_version,
    metrics_from_confusion_matrix,
    min_mapping_unit_pixels,
    summarise_change,
)

logger = logging.getLogger("sundarban.pipeline.runner")

DATA_SOURCE = "sentinel2_gee_random_forest"


@dataclass
class PipelineConfig:
    village_id: str = "gosaba"
    train_years: List[int] = field(default_factory=lambda: [2019, 2020, 2021, 2022])
    test_year: int = 2023
    predict_years: List[int] = field(default_factory=lambda: [2019, 2020, 2021, 2022, 2023, 2024, 2025])
    samples_per_class: int = 1000
    test_samples_per_class: int = 500
    rf_trees: int = 200
    seed: int = 42
    scale_m: int = 10
    edge_buffer_m: int = 30
    min_mapping_unit_ha: float = 0.5
    confidence_threshold: float = 0.6
    reference_asset: str = ""
    export_asset_prefix: Optional[str] = None  # e.g. "projects/my-proj/assets/sbc"

    @classmethod
    def from_settings(cls, village_id: str = "gosaba", **overrides: Any) -> "PipelineConfig":
        from ..core.config import settings

        base = dict(
            village_id=village_id,
            train_years=list(settings.PIPELINE_TRAIN_YEARS),
            test_year=settings.PIPELINE_TEST_YEAR,
            predict_years=list(settings.PIPELINE_PREDICT_YEARS),
            samples_per_class=settings.PIPELINE_SAMPLES_PER_CLASS,
            test_samples_per_class=settings.PIPELINE_TEST_SAMPLES_PER_CLASS,
            rf_trees=settings.PIPELINE_RF_TREES,
            seed=settings.PIPELINE_SEED,
            scale_m=settings.PIPELINE_SCALE_METERS,
            edge_buffer_m=settings.PIPELINE_EDGE_BUFFER_METERS,
            min_mapping_unit_ha=settings.PIPELINE_MIN_MAPPING_UNIT_HA,
            confidence_threshold=settings.PIPELINE_CONFIDENCE_THRESHOLD,
            reference_asset=settings.CGMD_ASSET_ID,
        )
        base.update(overrides)
        return cls(**base)

    def validate(self) -> None:
        if not self.train_years:
            raise ValueError("train_years must not be empty.")
        if self.test_year in self.train_years:
            raise ValueError(
                f"test_year {self.test_year} is also a training year; the accuracy test would be meaningless."
            )
        if self.samples_per_class < 50 or self.test_samples_per_class < 50:
            raise ValueError("Need at least 50 samples per class for a stable estimate.")
        if not (0.0 <= self.confidence_threshold <= 1.0):
            raise ValueError("confidence_threshold must be in [0, 1].")
        if self.scale_m <= 0 or self.rf_trees <= 0:
            raise ValueError("scale_m and rf_trees must be positive.")

    def training_signature(self) -> Dict[str, Any]:
        """Fields that define the model; used to derive the version id."""
        from .gee_steps import FEATURES

        return {
            "train_years": sorted(self.train_years),
            "samples_per_class": self.samples_per_class,
            "rf_trees": self.rf_trees,
            "seed": self.seed,
            "scale_m": self.scale_m,
            "edge_buffer_m": self.edge_buffer_m,
            "reference_asset": self.reference_asset,
            "features": FEATURES,
        }

    @property
    def model_version(self) -> str:
        return build_model_version(self.training_signature())


def _fetch(obj: Any) -> Any:
    """Single choke point for server round-trips, so tests can stub it."""
    return obj.getInfo()


def run_pipeline(
    config: PipelineConfig,
    geometry: Any,
    fetch: Callable[[Any], Any] = _fetch,
    steps: Any = None,
) -> Dict[str, Any]:
    """Execute the full pipeline for one village geometry and return a JSON-ready dict.

    `steps` defaults to app.pipeline.gee_steps; injecting a stand-in lets the
    orchestration be tested without Earth Engine.
    """
    config.validate()
    if steps is None:
        from . import gee_steps as steps  # type: ignore[no-redef]

    version = config.model_version
    logger.info(f"[Pipeline] {config.village_id}: model {version}, train {config.train_years}, test {config.test_year}")

    # 1. Training samples from years where the reference label never changed
    stable_labels = steps.stable_reference_labels(config.train_years, geometry, config.edge_buffer_m)
    sample_sets = []
    composite_meta: Dict[int, Dict[str, Any]] = {}
    for year in config.train_years:
        composite, meta = steps.annual_composite(year, geometry)
        composite_meta[year] = meta
        sample_sets.append(
            steps.stratified_samples(
                composite, stable_labels, geometry, config.samples_per_class, config.scale_m, config.seed + year
            )
        )
    training = steps.merge_samples(sample_sets)
    label_clf, prob_clf = steps.train_random_forest(training, config.rf_trees, config.seed)

    # 2. Held-out test against the reference map of a year the model never saw
    test_composite, test_meta = steps.annual_composite(config.test_year, geometry)
    composite_meta[config.test_year] = test_meta
    test_classified = steps.classify(test_composite, label_clf, prob_clf)
    test_reference = steps.reference_labels(config.test_year, geometry)
    cm = fetch(
        steps.confusion_matrix(
            test_classified, test_reference, geometry, config.test_samples_per_class, config.scale_m, config.seed
        )
    )
    accuracy = metrics_from_confusion_matrix(cm)
    accuracy["testYear"] = config.test_year
    accuracy["referenceSource"] = config.reference_asset
    accuracy["note"] = (
        "Agreement with the 30 m reference map at 10 m sample points; "
        "independent high-resolution validation points are reported separately."
    )
    logger.info(f"[Pipeline] {config.test_year} test: OA={accuracy['overallAccuracy']} kappa={accuracy['kappa']}")

    # 3. Classify every requested year with the same model
    classified: Dict[int, Any] = {}
    annual: List[Dict[str, Any]] = []
    for year in sorted(set(config.predict_years)):
        if year == config.test_year:
            classified[year] = test_classified
        else:
            composite, meta = steps.annual_composite(year, geometry)
            composite_meta[year] = meta
            classified[year] = steps.classify(composite, label_clf, prob_clf)

        grouped = fetch(steps.grouped_area(classified[year].select(steps.LABEL_BAND), geometry, config.scale_m))
        areas = areas_from_grouped_sum(grouped)
        low_conf = classified[year].select(steps.CONF_BAND).lt(config.confidence_threshold)
        uncertain_ha = float(fetch(steps.area_m2(low_conf, geometry, config.scale_m)) or 0.0) / 10_000.0
        annual.append(
            {
                "year": year,
                "mangroveHa": areas["Mangrove"],
                "nonMangroveHa": areas["Non-Mangrove"],
                "totalHa": areas["total"],
                "lowConfidenceHa": round(uncertain_ha, 2),
                "imageCount": composite_meta[year].get("imageCount"),
                "window": [composite_meta[year].get("startDate"), composite_meta[year].get("endDate")],
            }
        )

        if config.export_asset_prefix:
            steps.export_to_asset(
                classified[year],
                f"{config.export_asset_prefix}/{config.village_id}_{version}_{year}",
                geometry,
                config.scale_m,
                f"sbc_{config.village_id}_{year}",
            )

    # 4. Change between consecutive years and baseline → latest
    years = [row["year"] for row in annual]
    by_year = {row["year"]: row for row in annual}
    pairs = list(zip(years, years[1:]))
    if len(years) >= 2 and (years[0], years[-1]) not in pairs:
        pairs.append((years[0], years[-1]))

    min_pixels = min_mapping_unit_pixels(config.min_mapping_unit_ha, config.scale_m)
    changes: List[Dict[str, Any]] = []
    for a, b in pairs:
        masks = steps.change_masks(classified[a], classified[b], min_pixels, config.confidence_threshold)
        gain = float(fetch(steps.area_m2(masks["gain"], geometry, config.scale_m)) or 0.0) / 10_000.0
        loss = float(fetch(steps.area_m2(masks["loss"], geometry, config.scale_m)) or 0.0) / 10_000.0
        unc = float(fetch(steps.area_m2(masks["uncertain"], geometry, config.scale_m)) or 0.0) / 10_000.0
        changes.append(
            summarise_change(a, b, by_year[a]["mangroveHa"], by_year[b]["mangroveHa"], gain, loss, unc)
        )

    return {
        "villageId": config.village_id,
        "modelVersion": version,
        "dataSource": DATA_SOURCE,
        "isRealData": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "config": asdict(config),
        "classes": {str(k): v for k, v in BINARY_CLASSES.items()},
        "accuracy": accuracy,
        "annual": annual,
        "changes": changes,
        "minMappingUnitPixels": min_pixels,
    }


# --------------------------------------------------------------------------- #
# Persistence
# --------------------------------------------------------------------------- #
def _results_dir(results_dir: Optional[str] = None) -> Path:
    from ..core.config import settings

    path = Path(results_dir or settings.PIPELINE_RESULTS_DIR)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent.parent / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_result(result: Dict[str, Any], results_dir: Optional[str] = None) -> Path:
    """Write `<village>_<modelVersion>.json` and refresh `<village>_latest.json`."""
    directory = _results_dir(results_dir)
    stem = f"{result['villageId']}_{result['modelVersion']}"
    versioned = directory / f"{stem}.json"
    latest = directory / f"{result['villageId']}_latest.json"
    payload = json.dumps(result, indent=2, ensure_ascii=False)
    versioned.write_text(payload, encoding="utf-8")
    latest.write_text(payload, encoding="utf-8")
    logger.info(f"[Pipeline] Saved result to {versioned}")
    return versioned


def load_latest_result(village_id: str, results_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Latest saved pipeline output for a village, or None if the pipeline has not run."""
    path = _results_dir(results_dir) / f"{village_id}_latest.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
