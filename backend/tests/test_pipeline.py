"""Tests for the GEE Random Forest pipeline that run without Earth Engine credentials."""
import json
from typing import Any, Dict

import pytest

from app.pipeline import (
    MANGROVE,
    NON_MANGROVE,
    PipelineConfig,
    areas_from_grouped_sum,
    build_model_version,
    load_latest_result,
    metrics_from_confusion_matrix,
    min_mapping_unit_pixels,
    run_pipeline,
    save_result,
    summarise_change,
)


# --------------------------------------------------------------------------- #
# metrics.py
# --------------------------------------------------------------------------- #
def test_confusion_matrix_metrics_perfect():
    m = metrics_from_confusion_matrix([[100, 0], [0, 100]])
    assert m["overallAccuracy"] == 1.0
    assert m["kappa"] == 1.0
    assert m["f1Macro"] == 1.0
    assert m["sampleCount"] == 200
    assert m["confusionMatrix"]["classes"] == ["Non-Mangrove", "Mangrove"]


def test_confusion_matrix_metrics_known_values():
    # rows = reference, cols = predicted
    m = metrics_from_confusion_matrix([[90, 10], [20, 80]])
    assert m["overallAccuracy"] == 0.85
    mangrove = m["classMetrics"][MANGROVE]
    assert mangrove["producersAccuracy"] == 0.8   # 80 / 100 reference mangrove
    assert mangrove["usersAccuracy"] == pytest.approx(80 / 90, abs=1e-4)
    # kappa: po=0.85, pe = (100*110 + 100*90)/200^2 = 0.5 -> (0.85-0.5)/0.5
    assert m["kappa"] == 0.7


def test_confusion_matrix_rejects_bad_shapes():
    with pytest.raises(ValueError):
        metrics_from_confusion_matrix([[1, 2, 3], [4, 5, 6]])
    with pytest.raises(ValueError):
        metrics_from_confusion_matrix([[0, 0], [0, 0]])


def test_areas_from_grouped_sum_converts_to_hectares_and_ignores_unknown_groups():
    grouped = {"groups": [{"label": 1, "sum": 7_756_000.0}, {"label": 0, "sum": 4_694_000.0}, {"label": 7, "sum": 5.0}]}
    areas = areas_from_grouped_sum(grouped)
    assert areas["Mangrove"] == 775.6
    assert areas["Non-Mangrove"] == 469.4
    assert areas["total"] == 1245.0


def test_areas_from_grouped_sum_missing_class_is_zero():
    areas = areas_from_grouped_sum({"groups": [{"label": 1, "sum": 10_000.0}]})
    assert areas["Non-Mangrove"] == 0.0
    assert areas["total"] == 1.0


@pytest.mark.parametrize("mmu_ha,scale,expected", [(0.5, 10, 50), (0.5, 30, 6), (0, 10, 1), (0.01, 10, 1)])
def test_min_mapping_unit_pixels(mmu_ha, scale, expected):
    assert min_mapping_unit_pixels(mmu_ha, scale) == expected


def test_summarise_change_reports_both_mask_and_raw_difference():
    ch = summarise_change(2020, 2025, 750.6, 775.6, gain_ha=34.6, loss_ha=9.6, uncertain_ha=3.2)
    assert ch["netChangeHa"] == 25.0
    assert ch["rawAreaDifferenceHa"] == 25.0
    assert ch["annualisedNetChangeHa"] == 5.0
    assert ch["uncertainHa"] == 3.2


def test_model_version_is_deterministic_and_sensitive():
    a = build_model_version({"train_years": [2019, 2020], "trees": 200})
    b = build_model_version({"trees": 200, "train_years": [2019, 2020]})  # key order irrelevant
    c = build_model_version({"train_years": [2019, 2021], "trees": 200})
    assert a == b
    assert a != c
    assert a.startswith("rf-gee-v1-") and len(a) == len("rf-gee-v1-") + 8


# --------------------------------------------------------------------------- #
# PipelineConfig
# --------------------------------------------------------------------------- #
def test_config_from_settings_has_sane_defaults():
    cfg = PipelineConfig.from_settings("gosaba")
    cfg.validate()
    assert cfg.test_year not in cfg.train_years
    assert cfg.reference_asset.startswith("projects/")
    assert cfg.model_version == PipelineConfig.from_settings("gosaba").model_version


def test_config_rejects_test_year_inside_training_years():
    cfg = PipelineConfig.from_settings("gosaba", train_years=[2019, 2023], test_year=2023)
    with pytest.raises(ValueError, match="training year"):
        cfg.validate()


def test_config_version_changes_with_training_fields_only():
    base = PipelineConfig.from_settings("gosaba")
    same_model_more_years = PipelineConfig.from_settings("gosaba", predict_years=[2019, 2030])
    retrained = PipelineConfig.from_settings("gosaba", rf_trees=100)
    assert base.model_version == same_model_more_years.model_version
    assert base.model_version != retrained.model_version


# --------------------------------------------------------------------------- #
# runner.py with a stand-in for Earth Engine
# --------------------------------------------------------------------------- #
class _Obj:
    """Tagged placeholder standing in for an ee object; `select`/`lt` etc. keep the tag."""

    def __init__(self, tag: str):
        self.tag = tag

    def select(self, *_a, **_k):
        return self

    def lt(self, *_a, **_k):
        return _Obj(f"{self.tag}:lowconf")


class FakeSteps:
    """Mimics app.pipeline.gee_steps but returns tagged placeholders."""

    LABEL_BAND = "label"
    CONF_BAND = "confidence"

    def __init__(self):
        self.calls: list = []
        self.exports: list = []

    def stable_reference_labels(self, years, geometry, edge_buffer_m):
        self.calls.append(("stable", tuple(years), edge_buffer_m))
        return _Obj("stable")

    def annual_composite(self, year, geometry):
        self.calls.append(("composite", year))
        return _Obj(f"composite:{year}"), {"imageCount": 12, "startDate": f"{year}-01-01", "endDate": f"{year}-03-31"}

    def stratified_samples(self, composite, labels, geometry, per_class, scale, seed):
        self.calls.append(("samples", composite.tag, per_class, seed))
        return _Obj(f"samples:{composite.tag}")

    def merge_samples(self, sets):
        return _Obj("training")

    def train_random_forest(self, samples, n_trees, seed):
        self.calls.append(("train", samples.tag, n_trees, seed))
        return _Obj("clf"), _Obj("prob_clf")

    def classify(self, composite, label_clf, prob_clf):
        return _Obj(f"classified:{composite.tag.split(':')[1]}")

    def reference_labels(self, year, geometry):
        return _Obj(f"ref:{year}")

    def confusion_matrix(self, classified, reference, geometry, per_class, scale, seed):
        self.calls.append(("confusion", classified.tag, reference.tag))
        return _Obj("cm")

    def grouped_area(self, image, geometry, scale):
        return _Obj(f"area:{image.tag}")

    def area_m2(self, mask, geometry, scale):
        return _Obj(f"m2:{mask.tag}")

    def change_masks(self, a, b, min_pixels, threshold):
        self.calls.append(("change", a.tag, b.tag, min_pixels))
        pair = f"{a.tag.split(':')[1]}-{b.tag.split(':')[1]}"
        return {k: _Obj(f"{k}:{pair}") for k in ("gain", "loss", "uncertain", "stable_mangrove")}

    def export_to_asset(self, image, asset_id, geometry, scale, description):
        self.exports.append(asset_id)


def _fake_fetch(obj: Any) -> Any:
    """Canned server responses keyed by placeholder tag."""
    tag = obj.tag
    if tag == "cm":
        return [[450, 50], [30, 470]]
    if tag.startswith("area:classified:"):
        year = int(tag.rsplit(":", 1)[1])
        mangrove = 750.0 + 5 * (year - 2019)  # +5 ha / year
        return {"groups": [{"label": MANGROVE, "sum": mangrove * 10_000}, {"label": NON_MANGROVE, "sum": (1245 - mangrove) * 10_000}]}
    if tag.startswith("m2:gain"):
        return 8 * 10_000.0
    if tag.startswith("m2:loss"):
        return 3 * 10_000.0
    if tag.startswith("m2:uncertain"):
        return 1 * 10_000.0
    if tag.endswith(":lowconf"):
        return 20 * 10_000.0
    raise AssertionError(f"unexpected fetch for {tag}")


def _run(tmp_path, **overrides) -> Dict[str, Any]:
    cfg = PipelineConfig.from_settings(
        "gosaba", train_years=[2019, 2020], test_year=2023, predict_years=[2019, 2023, 2025], **overrides
    )
    steps = FakeSteps()
    result = run_pipeline(cfg, geometry=object(), fetch=_fake_fetch, steps=steps)
    return {"result": result, "steps": steps, "config": cfg}


def test_runner_trains_only_on_train_years_and_tests_on_held_out_year(tmp_path):
    out = _run(tmp_path)
    calls = out["steps"].calls
    assert ("stable", (2019, 2020), 30) in calls
    sampled_years = sorted(int(c[1].split(":")[1]) for c in calls if c[0] == "samples")
    assert sampled_years == [2019, 2020]
    assert ("confusion", "classified:2023", "ref:2023") in calls


def test_runner_result_structure_and_numbers(tmp_path):
    res = _run(tmp_path)["result"]
    assert res["isRealData"] is True
    assert res["dataSource"] == "sentinel2_gee_random_forest"
    assert res["modelVersion"].startswith("rf-gee-v1-")

    assert res["accuracy"]["overallAccuracy"] == 0.92
    assert res["accuracy"]["testYear"] == 2023

    years = [row["year"] for row in res["annual"]]
    assert years == [2019, 2023, 2025]
    assert res["annual"][0]["mangroveHa"] == 750.0
    assert res["annual"][-1]["mangroveHa"] == 780.0
    assert res["annual"][0]["lowConfidenceHa"] == 20.0

    pairs = [(c["fromYear"], c["toYear"]) for c in res["changes"]]
    assert pairs == [(2019, 2023), (2023, 2025), (2019, 2025)]
    first = res["changes"][0]
    assert first["gainHa"] == 8.0 and first["lossHa"] == 3.0 and first["netChangeHa"] == 5.0
    assert first["uncertainHa"] == 1.0
    assert res["minMappingUnitPixels"] == 50


def test_runner_exports_when_prefix_given(tmp_path):
    out = _run(tmp_path, export_asset_prefix="projects/x/assets/sbc")
    assert len(out["steps"].exports) == 3
    assert out["steps"].exports[0].startswith("projects/x/assets/sbc/gosaba_rf-gee-v1-")


def test_save_and_load_result_roundtrip(tmp_path):
    res = _run(tmp_path)["result"]
    path = save_result(res, results_dir=str(tmp_path))
    assert path.exists()
    latest = load_latest_result("gosaba", results_dir=str(tmp_path))
    assert latest is not None
    assert latest["modelVersion"] == res["modelVersion"]
    assert json.loads(path.read_text())["annual"] == res["annual"]
    assert load_latest_result("nowhere", results_dir=str(tmp_path)) is None
