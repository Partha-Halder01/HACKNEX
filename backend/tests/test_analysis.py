"""Tests for the location + date-range analysis (maths, demo engine, GEE orchestration, API)."""
from datetime import date
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from app.analysis import AnalysisRequest, AnalysisRequestError, run_analysis
from app.analysis import gee_engine, service
from app.analysis.carbon import DENSITY_MG_C_PER_HA, area_uncertainty_pct, carbon_change, carbon_stock
from app.analysis.narrative import numbers_in, validate_ai_text
from app.analysis.projection import linear_trend, project_scenarios
from app.main import app

GOSABA = dict(lat=22.165, lon=88.805)


def _req(**kw) -> AnalysisRequest:
    base = dict(**GOSABA, radius_km=3.0, start_date=date(2020, 1, 1), end_date=date(2025, 3, 31))
    base.update(kw)
    return AnalysisRequest(**base)


@pytest.fixture(autouse=True)
def _offline(monkeypatch):
    """Force the demo engine unless a test opts in to the fake GEE engine."""
    monkeypatch.setattr(service, "_gee_ready", lambda: (False, "GEE_DISABLED", "disabled"))
    service.clear_cache()
    yield
    service.clear_cache()


# --------------------------------------------------------------------------- #
# Request validation and windows
# --------------------------------------------------------------------------- #
def test_request_rejects_bad_input():
    today = date(2026, 9, 25)
    with pytest.raises(AnalysisRequestError):
        _req(radius_km=20).validate(today)
    with pytest.raises(AnalysisRequestError):
        _req(start_date=date(2017, 1, 1)).validate(today)
    with pytest.raises(AnalysisRequestError):
        _req(end_date=date(2027, 1, 1)).validate(today)
    with pytest.raises(AnalysisRequestError):
        _req(start_date=date(2024, 1, 1), end_date=date(2024, 3, 1)).validate(today)
    with pytest.raises(AnalysisRequestError, match="overlap"):
        _req(start_date=date(2024, 1, 1), end_date=date(2024, 8, 1), window_days=120).validate(today)


def test_request_warnings_for_outside_delta_and_season_mismatch():
    today = date(2026, 9, 25)
    assert _req().validate(today) == []
    warnings = _req(lat=28.6, lon=77.2, end_date=date(2025, 8, 31)).validate(today)
    assert any("outside the Sundarban" in w for w in warnings)
    assert any("different seasons" in w for w in warnings)


def test_periods_start_dry_seasons_end():
    periods = _req().periods()
    keys = [p["key"] for p in periods]
    assert keys == ["start", "y2021", "y2022", "y2023", "y2024", "end"]
    assert periods[0]["startDate"] == "2020-01-01" and periods[0]["endDate"] == "2020-03-31"
    assert periods[-1]["endDate"] == "2025-03-31"
    assert all(a["decimalYear"] < b["decimalYear"] for a, b in zip(periods, periods[1:]))


def test_scale_and_area():
    assert _req(radius_km=1).scale_m == 10
    assert _req(radius_km=5).scale_m == 20
    assert _req(radius_km=1).aoi_area_ha == pytest.approx(314.16, abs=0.01)


# --------------------------------------------------------------------------- #
# Carbon and projection maths
# --------------------------------------------------------------------------- #
def test_carbon_stock_uses_tier1_density_and_combined_uncertainty():
    st = carbon_stock(100.0, 3.5)
    assert DENSITY_MG_C_PER_HA == pytest.approx(283.1)
    assert st["carbonMgC"] == pytest.approx(28310.0)
    assert st["co2eMg"] == pytest.approx(28310.0 * 44 / 12, rel=1e-4)
    assert st["uncertaintyPct"] == pytest.approx(18.3, abs=0.05)
    lo, hi = st["carbonRangeMgC"]
    assert lo < st["carbonMgC"] < hi


def test_area_uncertainty_from_accuracy():
    assert area_uncertainty_pct(None) == 3.5
    acc = {"classMetrics": [{"className": "Mangrove", "f1": 0.9}]}
    assert area_uncertainty_pct(acc) == pytest.approx(10.0)
    acc = {"classMetrics": [{"className": "Mangrove", "f1": 0.99}]}
    assert area_uncertainty_pct(acc) == 3.5  # floored


def test_carbon_change_range_brackets_value():
    c = carbon_change(1000, 980, gain_ha=10, loss_ha=30, uncertain_ha=5, span_years=5, area_unc_pct=3.5)
    assert c["carbonChangeMgC"] == pytest.approx(-20 * 283.1, abs=0.1)
    lo, hi = c["carbonChangeRangeMgC"]
    assert lo < c["carbonChangeMgC"] < hi
    assert c["grossLossCarbonMgC"] == pytest.approx(30 * 283.1, abs=0.1)


def test_linear_trend_exact_fit_and_two_point_fallback():
    slope, se = linear_trend([(2020, 100), (2021, 102), (2022, 104), (2023, 106)], 3.5)
    assert slope == pytest.approx(2.0)
    assert se > 0  # measurement floor applies even to a perfect fit
    slope2, se2 = linear_trend([(2020, 100), (2025, 90)], 3.5)
    assert slope2 == pytest.approx(-2.0)
    assert se2 > 0


def test_projection_scenarios_order_and_bounds():
    pts = [(2020.1, 800), (2022.1, 790), (2025.1, 780)]
    proj = project_scenarios(pts, gain_ha=10, loss_ha=30, span_years=5, aoi_area_ha=2827, area_unc_pct=3.5)
    by_id = {s["id"]: s for s in proj["scenarios"]}
    assert set(by_id) == {"current_trend", "higher_loss", "recovery"}
    last = {k: v["points"][-1] for k, v in by_id.items()}
    assert last["higher_loss"]["mangroveHa"] < last["current_trend"]["mangroveHa"] < last["recovery"]["mangroveHa"]
    for sc in proj["scenarios"]:
        assert sc["points"][0]["mangroveHa"] == 780
        assert len(sc["points"]) == 6
        for p in sc["points"]:
            assert 0 <= p["lowHa"] <= p["mangroveHa"] <= p["highHa"] <= 2827
            assert p["carbonLowMgC"] <= p["carbonMgC"] <= p["carbonHighMgC"]


# --------------------------------------------------------------------------- #
# Narrative validator
# --------------------------------------------------------------------------- #
def test_numbers_in_handles_bengali_digits_and_commas():
    assert numbers_in("১,২৩৪.৫ হেক্টর and 2,000") == [1234.5, 2000.0]


def test_numbers_in_ignores_iso_dates():
    assert numbers_in("from 2020-01-01 to 2026-03-31 it grew 5.5 ha") == [5.5]


def test_validator_rejects_invented_numbers_and_claims():
    ev = [{"id": "E1", "value": 775.6}, {"id": "E2", "value": 18.3}]
    assert validate_ai_text(["Mangrove covers 775.6 ha (±18.3%) in 2025 over 5 years."], ["E1"], ev, []) == []
    issues = validate_ai_text(["Mangrove covers 912.4 ha."], ["E1"], ev, [])
    assert any("912.4" in i for i in issues)
    assert validate_ai_text(["These are verified carbon credits."], ["E1"], ev, [])
    assert validate_ai_text(["ok"], ["E9"], ev, [])


# --------------------------------------------------------------------------- #
# Demo engine end-to-end
# --------------------------------------------------------------------------- #
def test_demo_bundle_is_consistent_and_labelled():
    b = run_analysis(_req())
    assert b["dataSource"]["isRealData"] is False
    assert b["dataSource"]["id"] == "demo_synthetic"
    assert b["accuracy"] is None and b["historical"] is None and b["tiles"] is None
    s, e = b["summary"]["start"], b["summary"]["end"]
    ch = b["change"]
    assert ch["netChangeHa"] == pytest.approx(e["mangroveHa"] - s["mangroveHa"], abs=0.05)
    assert b["carbon"]["end"]["carbonMgC"] == pytest.approx(e["mangroveHa"] * 283.1, rel=1e-3)
    assert len(b["carbon"]["series"]) == len(b["timeline"]) == 6
    assert b["narrative"]["en"][0].startswith("Demo data")
    assert b["narrative"]["bn"] and b["evidence"][0]["id"] == "E1"


def test_demo_is_deterministic_per_location():
    a = run_analysis(_req())
    service.clear_cache()
    b = run_analysis(_req())
    c = run_analysis(_req(lat=21.9, lon=88.9))
    assert a["summary"] == b["summary"]
    assert a["summary"] != c["summary"]


# --------------------------------------------------------------------------- #
# Live GEE engine orchestration with a fake Earth Engine
# --------------------------------------------------------------------------- #
class _Obj:
    def __init__(self, tag: str):
        self.tag = tag

    def __getattr__(self, name):
        if name.startswith("__"):
            raise AttributeError(name)
        return lambda *a, **k: _Obj(f"{self.tag}.{name}")

    def getMapId(self, vis):
        return {"tile_fetcher": type("TF", (), {"url_format": f"https://tiles/{self.tag}/{{z}}/{{x}}/{{y}}"})()}


class _Dict:
    def __init__(self, d):
        self.d = d


class _FakeEE:
    class Geometry:
        @staticmethod
        def Point(coords):
            return _Obj("point")

    class Image:
        def __new__(cls, *a):
            return _Obj("img")

        @staticmethod
        def cat(bands):
            return _Obj("cat")

        @staticmethod
        def pixelArea():
            return _Obj("pixelArea")

    class Reducer:
        @staticmethod
        def sum():
            return _Obj("sum")

    Dictionary = _Dict


class _Img(_Obj):
    """Composite / classified image whose tag survives select()/clip()."""

    def select(self, *a, **k):
        return self if not a else _Img(f"{self.tag}|{a[0]}")

    def clip(self, *_a):
        return self

    def lt(self, *_a):
        return _Obj(f"{self.tag}|lowconf")


class _FakeSteps:
    FEATURES = ["B2", "B3", "B4", "B8", "B11", "B12", "NDVI", "NDWI"]
    LABEL_BAND = "label"
    CONF_BAND = "confidence"

    def _ee(self):
        return _FakeEE

    def stable_reference_labels(self, years, geom, buf):
        return _Obj("stable")

    def annual_composite(self, year, geom):
        return _Img(f"annual{year}"), {"imageCount": 9}

    def stratified_samples(self, *a):
        return _Obj("samples")

    def merge_samples(self, sets):
        return _Obj("training")

    def train_random_forest(self, *a):
        return _Obj("clf"), _Obj("prob")

    def classify(self, composite, *a):
        return _Img(f"cls:{composite.tag}")

    def reference_labels(self, year, geom):
        return _Obj(f"ref{year}")

    def reference_canopy_fraction(self, year, geom):
        return _Obj(f"fcc{year}")

    def confusion_matrix(self, *a):
        return _Obj("cm")

    def grouped_area(self, image, geom, scale):
        return _Obj(f"grouped:{image.tag}")

    def area_m2(self, mask, geom, scale):
        return _Obj(f"m2:{mask.tag}")

    def change_masks(self, a, b, min_px, thr):
        return {k: _Obj(f"mask:{k}") for k in ("gain", "loss", "uncertain", "stable_mangrove")}


def _fake_fetch(obj: Any) -> Any:
    if isinstance(obj, _Dict):
        return {k: _fake_fetch(v) for k, v in obj.d.items()}
    tag = obj.tag
    if tag.endswith("aggregate_histogram"):
        return {"0": 600, "1": 600}
    if tag == "cm":
        return [[180, 20], [10, 190]]
    if tag.startswith("grouped:cls:comp:"):
        start = tag.split("comp:")[1].split("|")[0]
        mangrove = 1500.0 - 4 * (int(start[:4]) - 2020)
        return {"groups": [{"label": 1, "sum": mangrove * 1e4}, {"label": 0, "sum": (2827.43 - mangrove) * 1e4}]}
    if tag.startswith("m2:") and tag.endswith("|lowconf"):
        return 50 * 1e4
    if tag.startswith("m2:mask:"):
        return {"gain": 12, "loss": 32, "uncertain": 4, "stable_mangrove": 1460}[tag.split(":")[2]] * 1e4
    if tag.startswith("pixelArea.updateMask.reduceRegion"):
        return 1400 * 1e4  # CGMD reference area for the area check
    if tag.startswith("cat.reduceRegion"):
        return {"y1990": 1600 * 1e4, "y2018": 1520 * 1e4}
    raise AssertionError(f"unexpected fetch {tag}")


def test_gee_engine_orchestration(monkeypatch):
    monkeypatch.setattr(
        gee_engine, "build_sentinel_composite",
        lambda geometry, start_date, end_date: (_Img(f"comp:{start_date}"), {"imageCount": 7}),
    )
    monkeypatch.setattr(gee_engine.settings, "CGMD_HISTORY_YEARS", [1990, 2018])
    obs = gee_engine.observe(_req(), fetch=_fake_fetch, steps=_FakeSteps())

    assert obs["isRealData"] is True
    assert obs["modelVersion"].startswith("rf-gee-ondemand-v1-")
    assert [r["key"] for r in obs["timeline"]] == ["start", "y2021", "y2022", "y2023", "y2024", "end"]
    assert obs["timeline"][0]["mangroveHa"] == 1500.0
    assert obs["timeline"][-1]["mangroveHa"] == 1484.0
    assert obs["timeline"][0]["lowConfidenceHa"] == 50.0
    assert obs["change"] == {
        "gainHa": 12.0, "lossHa": 32.0, "uncertainHa": 4.0, "stableMangroveHa": 1460.0,
        "minMappingUnitHa": 0.5, "confidenceThreshold": 0.6,
    }
    assert obs["accuracy"]["overallAccuracy"] == 0.925
    check = obs["accuracy"]["areaCheck"]
    assert check["referenceHa"] == 1400.0 and check["modelHa"] == 1488.0 and check["agrees"] is True
    assert obs["historical"] == [{"year": 1990, "mangroveHa": 1600.0}, {"year": 2018, "mangroveHa": 1520.0}]
    assert set(obs["tiles"]) == {"trueColorEnd", "classStart", "classEnd", "change"}
    assert obs["training"]["samplesByClass"] == {"Non-Mangrove": 600, "Mangrove": 600}

    bundle = service.build_bundle(_req(), obs, [])
    # F1 of mangrove from the fake matrix → area uncertainty above the 3.5% floor
    assert bundle["carbon"]["areaUncertaintyPct"] > 3.5
    assert bundle["change"]["netChangeHa"] == -20.0


def test_gee_engine_flags_area_disagreement(monkeypatch):
    monkeypatch.setattr(
        gee_engine, "build_sentinel_composite",
        lambda geometry, start_date, end_date: (_Img(f"comp:{start_date}"), {"imageCount": 7}),
    )

    def fetch(obj):
        if not isinstance(obj, _Dict) and obj.tag.startswith("pixelArea.updateMask.reduceRegion"):
            return 30 * 1e4  # reference shows far less mangrove than the model's 1488 ha
        return _fake_fetch(obj)

    obs = gee_engine.observe(_req(), fetch=fetch, steps=_FakeSteps())
    assert obs["accuracy"]["areaCheck"]["agrees"] is False
    assert any("Area check failed" in n for n in obs["notes"])


def test_gee_engine_missing_end_images_is_user_error(monkeypatch):
    from app.geospatial.sentinel2 import SentinelProcessingError

    def composite(geometry, start_date, end_date):
        if start_date.startswith("2024-12") or start_date.startswith("2025"):
            raise SentinelProcessingError("NO_SENTINEL_IMAGES", "none")
        return _Img(f"comp:{start_date}"), {"imageCount": 7}

    monkeypatch.setattr(gee_engine, "build_sentinel_composite", composite)
    with pytest.raises(gee_engine.GeeAnalysisError, match="end window"):
        gee_engine.observe(_req(), fetch=_fake_fetch, steps=_FakeSteps())


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
client = TestClient(app)


def test_api_capabilities():
    r = client.get("/api/analysis/capabilities")
    assert r.status_code == 200
    body = r.json()
    assert body["liveEngine"] is False
    assert body["limits"]["maxRadiusKm"] == 10.0


def test_api_run_and_validation_error():
    payload = {**GOSABA, "radiusKm": 2, "startDate": "2020-01-01", "endDate": "2025-03-31"}
    r = client.post("/api/analysis/run", json=payload)
    assert r.status_code == 200
    body = r.json()
    for key in ("summary", "timeline", "change", "carbon", "projection", "narrative", "evidence", "dataSource"):
        assert key in body
    bad = client.post("/api/analysis/run", json={**payload, "radiusKm": 50})
    assert bad.status_code == 422
    assert "Radius" in bad.json()["detail"]


def test_api_field_points_roundtrip(monkeypatch, tmp_path):
    monkeypatch.setattr(service.settings, "FIELD_POINTS_PATH", str(tmp_path / "fp.jsonl"))
    point = {**GOSABA, "observedClass": "mangrove", "observedOn": "2026-02-01", "note": "dense Avicennia"}
    r = client.post("/api/analysis/field-points", json=point)
    assert r.status_code == 201 and r.json()["storage"] == "file"
    listed = client.get("/api/analysis/field-points").json()
    assert listed[0]["note"] == "dense Avicennia"



# --------------------------------------------------------------------------- #
# Reliability ("how sure are we?")
# --------------------------------------------------------------------------- #
from app.analysis.reliability import assess  # noqa: E402


def _real_bundle(start_ha=700.0, end_ha=705.0, images=(20, 20), agrees=True, oa=0.93):
    return {
        "dataSource": {"isRealData": True},
        "timeline": [{"imageCount": images[0]}, {"imageCount": images[1]}],
        "summary": {"start": {"mangroveHa": start_ha}, "end": {"mangroveHa": end_ha}},
        "change": {"percentChange": round(100 * (end_ha - start_ha) / start_ha, 1)},
        "accuracy": {"overallAccuracy": oa, "areaCheck": {"agrees": agrees}},
    }


def test_reliability_levels():
    assert assess(_req(), _real_bundle())["level"] == "high"
    # different seasons -> low, with a plain reason
    low = assess(_req(end_date=date(2022, 7, 8)), _real_bundle())
    assert low["level"] == "low" and low["problems"][0]["id"] == "season"
    # model disagrees with reference map -> low
    assert assess(_req(), _real_bundle(agrees=False))["level"] == "low"
    # few images or very fast change -> medium
    assert assess(_req(), _real_bundle(images=(4, 20)))["level"] == "medium"
    assert assess(_req(), _real_bundle(end_ha=300.0))["level"] == "medium"


def test_demo_bundle_has_demo_reliability_and_low_warns_in_text():
    b = run_analysis(_req())
    assert b["reliability"]["level"] == "demo"
    b2 = run_analysis(_req(end_date=date(2024, 7, 31)))
    assert b2["reliability"]["level"] == "demo"
