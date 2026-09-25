"""Comprehensive tests for Phase 5 Land-Cover Change Detection (2020 vs 2025)."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.change_detection import (
    CELL_AREA_HECTARES,
    CELL_SIZE_METERS,
    DEFAULT_CONFIDENCE_THRESHOLD,
    CHANGE_CATEGORY_STABLE,
    CHANGE_CATEGORY_MANGROVE_LOSS,
    CHANGE_CATEGORY_MANGROVE_GAIN,
    CHANGE_CATEGORY_CLASS_CONVERSION,
    CHANGE_CATEGORY_LOW_CONFIDENCE,
    SpatialCoverageMismatchError,
    IncompatibleModelVersionError,
    InvalidTemporalComparisonError,
    validate_temporal_consistency,
    validate_model_compatibility,
    categorize_transition,
    compute_transition_matrix,
)
from app.ml.labels import LAND_COVER_CLASSES, CLASS_NAMES

client = TestClient(app)


# =====================================================================
# 1. TEMPORAL & MODEL CONSISTENCY VALIDATION TESTS
# =====================================================================

def test_temporal_consistency_validation():
    """Verify that from_year < to_year ordering is strictly enforced."""
    validate_temporal_consistency(2020, 2025)
    validate_temporal_consistency(2015, 2020)

    with pytest.raises(InvalidTemporalComparisonError, match="strictly less than"):
        validate_temporal_consistency(2025, 2020)

    with pytest.raises(InvalidTemporalComparisonError, match="strictly less than"):
        validate_temporal_consistency(2025, 2025)


def test_model_version_compatibility():
    """Verify compatible model version checking and mismatch rejection."""
    m_2020 = {"modelName": "RandomForestClassifier", "modelVersion": "rf-v1", "featureVersion": "sentinel2-v1"}
    m_2025 = {"modelName": "RandomForestClassifier", "modelVersion": "rf-v1", "featureVersion": "sentinel2-v1"}
    validate_model_compatibility(m_2020, m_2025)

    m_incompatible = {"modelName": "RandomForestClassifier", "modelVersion": "rf-v2", "featureVersion": "sentinel2-v1"}
    with pytest.raises(IncompatibleModelVersionError, match="Incompatible model versions"):
        validate_model_compatibility(m_2020, m_incompatible)


# =====================================================================
# 2. TRANSITION CATEGORIZATION & TAXONOMY TESTS
# =====================================================================

def test_transition_categorization():
    """Verify taxonomic categorization of transitions."""
    assert categorize_transition(0, 0, 0.95) == CHANGE_CATEGORY_STABLE
    assert categorize_transition(1, 1, 0.95) == CHANGE_CATEGORY_STABLE
    assert categorize_transition(0, 1, 0.95) == CHANGE_CATEGORY_MANGROVE_LOSS
    assert categorize_transition(0, 2, 0.95) == CHANGE_CATEGORY_MANGROVE_LOSS
    assert categorize_transition(1, 0, 0.95) == CHANGE_CATEGORY_MANGROVE_GAIN
    assert categorize_transition(3, 0, 0.95) == CHANGE_CATEGORY_MANGROVE_GAIN
    assert categorize_transition(1, 2, 0.95) == CHANGE_CATEGORY_CLASS_CONVERSION
    assert categorize_transition(3, 4, 0.95) == CHANGE_CATEGORY_CLASS_CONVERSION

    # Low confidence flagging (< 0.60)
    assert categorize_transition(0, 2, 0.45) == CHANGE_CATEGORY_LOW_CONFIDENCE


# =====================================================================
# 3. SYNTHETIC 4-CELL DETERMINISTIC TEST FIXTURE (REQUIREMENT 37)
# =====================================================================

def test_four_cell_deterministic_fixture():
    """Verify exact 4-cell transition fixture from Phase 5 specification:
    2020: [Mangrove (0), Mangrove (0), Water (1), Aquaculture (2)]
    2025: [Mangrove (0), Aquaculture (2), Mangrove (0), Aquaculture (2)]
    Expected:
      1 stable Mangrove (0 -> 0)
      1 Mangrove -> Aquaculture (0 -> 2, Loss)
      1 Water -> Mangrove (1 -> 0, Gain)
      1 stable Aquaculture (2 -> 2)
    """
    grid_2020 = [0, 0, 1, 2]
    grid_2025 = [0, 2, 0, 2]
    res = compute_transition_matrix(grid_2020, grid_2025, cell_area_ha=0.04)

    assert res["totalCells"] == 4
    assert res["totalAreaHa"] == 0.16

    mg = res["mangroveSummary"]
    assert mg["baselineMangroveHa"] == 0.08  # 2 cells * 0.04
    assert mg["comparisonMangroveHa"] == 0.08  # 2 cells * 0.04
    assert mg["grossGainHa"] == 0.04  # 1 cell from Water
    assert mg["grossLossHa"] == 0.04  # 1 cell to Aquaculture
    assert mg["netChangeHa"] == 0.00
    assert mg["percentChange"] == 0.00
    assert mg["stableMangroveHa"] == 0.04

    # Loss & Gain breakdowns
    assert mg["lossBreakdown"]["toAquacultureHa"] == 0.04
    assert mg["lossBreakdown"]["toWaterHa"] == 0.00
    assert mg["gainBreakdown"]["fromWaterHa"] == 0.04
    assert mg["gainBreakdown"]["fromBareLandHa"] == 0.00


# =====================================================================
# 4. ALL 25 TRANSITIONS & 5x5 MATRIX INTEGRITY
# =====================================================================

def test_all_25_transitions_supported():
    """Verify that all 25 possible class-to-class transitions are computed."""
    # Build 25-cell grid containing every combination (0..4 -> 0..4)
    grid_2020 = []
    grid_2025 = []
    for i in range(5):
        for j in range(5):
            grid_2020.append(i)
            grid_2025.append(j)

    res = compute_transition_matrix(grid_2020, grid_2025, cell_area_ha=CELL_AREA_HECTARES)
    assert res["totalCells"] == 25
    assert len(res["transitions"]) == 25
    assert len(res["matrixCounts"]) == 5
    assert all(len(row) == 5 for row in res["matrixCounts"])

    # Every matrix entry should equal exactly 1 cell
    for i in range(5):
        for j in range(5):
            assert res["matrixCounts"][i][j] == 1
            assert res["matrixAreasHa"][i][j] == CELL_AREA_HECTARES


# =====================================================================
# 5. SPATIAL MISMATCH & ZERO DENOMINATOR HANDLING
# =====================================================================

def test_spatial_coverage_mismatch_error():
    """Verify error when baseline and comparison grids differ in size."""
    with pytest.raises(SpatialCoverageMismatchError, match="Spatial coverage mismatch"):
        compute_transition_matrix([0, 1, 2], [0, 1])


def test_zero_denominator_mangrove_percentage():
    """Verify safe percent calculation when baseline mangrove area is 0."""
    grid_2020 = [1, 1, 1, 1]  # No mangroves in 2020
    grid_2025 = [0, 1, 1, 1]  # 1 mangrove in 2025
    res = compute_transition_matrix(grid_2020, grid_2025, cell_area_ha=0.04)

    assert res["mangroveSummary"]["baselineMangroveHa"] == 0.00
    assert res["mangroveSummary"]["comparisonMangroveHa"] == 0.04
    assert res["mangroveSummary"]["grossGainHa"] == 0.04
    assert res["mangroveSummary"]["percentChange"] is None  # Safe None instead of ZeroDivisionError


# =====================================================================
# 6. CONFIDENCE PROXY & LOW-CONFIDENCE FLAGS
# =====================================================================

def test_confidence_proxy_and_thresholding():
    """Verify conservative confidence heuristic min(conf_base, conf_comp)."""
    grid_2020 = [0, 0]
    grid_2025 = [0, 2]  # Cell 1 is stable, Cell 2 changes
    conf_2020 = [0.90, 0.85]
    conf_2025 = [0.92, 0.50]  # Cell 2 confidence is 0.50 (< 0.60 threshold)

    res = compute_transition_matrix(
        grid_2020,
        grid_2025,
        conf_baseline=conf_2020,
        conf_comparison=conf_2025,
        confidence_threshold=0.60,
    )

    cf = res["confidenceSummary"]
    assert cf["lowConfidenceChangeCells"] == 1
    assert cf["lowConfidenceChangeAreaHa"] == 0.04


# =====================================================================
# 7. FASTAPI ROUTE INTEGRATION TESTS
# =====================================================================

def test_api_change_detection_gosaba():
    """Verify GET /api/change-detection for Gosaba sector."""
    res = client.get("/api/change-detection?village_id=gosaba&from_year=2020&to_year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert data["fromYear"] == 2020
    assert data["toYear"] == 2025
    assert data["gainHa"] == pytest.approx(34.6, rel=1e-1)
    assert data["lossHa"] == pytest.approx(9.6, rel=1e-1)
    assert data["netChangeHa"] == pytest.approx(25.0, rel=1e-1)
    assert "mangroveSummary" in data
    assert "confidenceSummary" in data
    assert "transitionMatrix" in data
    assert len(data["transitionMatrix"]["transitions"]) == 25
    assert len(data["alerts"]) > 0
    assert len(data["metrics"]) > 0


def test_api_change_detection_transitions():
    """Verify GET /api/change-detection/transitions endpoint."""
    res = client.get("/api/change-detection/transitions?village_id=gosaba&from_year=2020&to_year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["classes"] == CLASS_NAMES
    assert len(data["matrix"]) == 5
    assert len(data["transitions"]) == 25


def test_api_change_detection_preview_geojson():
    """Verify GET /api/change-detection/preview GeoJSON FeatureCollection."""
    res = client.get("/api/change-detection/preview?village_id=gosaba&from_year=2020&to_year=2025&include_low_confidence=true")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert "geojson" in data
    assert data["geojson"]["type"] == "FeatureCollection"
    assert len(data["geojson"]["features"]) >= 3

    feat = data["geojson"]["features"][0]
    assert feat["type"] == "Feature"
    assert "transition" in feat["properties"]
    assert "changeCategory" in feat["properties"]
    assert "changeConfidence" in feat["properties"]


def test_api_change_detection_validation_errors():
    """Verify error responses for missing village and invalid years."""
    # Missing village
    res_no_village = client.get("/api/change-detection")
    assert res_no_village.status_code == 422

    # from_year >= to_year
    res_bad_years = client.get("/api/change-detection?village_id=gosaba&from_year=2025&to_year=2020")
    assert res_bad_years.status_code == 400


def test_scientific_wording_guardrails_change_detection():
    """Verify change detection alerts and metrics use neutral scientific wording without causal claims."""
    res = client.get("/api/change-detection?village_id=gosaba&from_year=2020&to_year=2025")
    assert res.status_code == 200
    data = res.json()

    # 1. Prohibited causal/ecological phrases must NOT appear in response
    resp_text = res.text
    assert "Erosion fringe along Gosaba Riverfront" not in resp_text
    assert "Localized riverbank erosion" not in resp_text
    assert "Natural pioneer seedling recruitment" not in resp_text
    assert "Avicennia colonization" not in resp_text
    assert "newly accreted mudflats" not in resp_text

    # 2. Approved neutral transition titles and descriptions MUST appear
    alert_titles = [a["title"] for a in data["alerts"]]
    assert "Mangrove → Water Transition" in alert_titles
    assert "Mangrove Gain Detected" in alert_titles

    water_alert = next(a for a in data["alerts"] if a["title"] == "Mangrove → Water Transition")
    assert "An estimated mangrove-to-water land-cover transition was detected" in water_alert["description"]
    assert "Field verification is recommended before interpreting the underlying cause." in water_alert["description"]
    assert water_alert["affectedAreaHa"] == pytest.approx(5.8, rel=1e-2)

    gain_alert = next(a for a in data["alerts"] if a["title"] == "Mangrove Gain Detected")
    assert "An estimated transition into the mangrove class was detected" in gain_alert["description"]
    assert "Field verification is recommended before interpreting the ecological cause." in gain_alert["description"]
    assert gain_alert["affectedAreaHa"] == pytest.approx(12.4, rel=1e-2)

    # 3. Metric category must be neutral transition
    metric_categories = [m["category"] for m in data["metrics"]]
    assert "Mangrove → Aquaculture Transition" in metric_categories
    aqua_metric = next(m for m in data["metrics"] if m["category"] == "Mangrove → Aquaculture Transition")
    assert aqua_metric["areaHa"] == pytest.approx(3.8, rel=1e-2)
    assert aqua_metric["trend"] == "loss"

    # 4. Exact numerical values preserved
    mg = data["mangroveSummary"]
    assert mg["baselineMangroveHa"] == pytest.approx(750.60, rel=1e-2)
    assert mg["comparisonMangroveHa"] == pytest.approx(775.60, rel=1e-2)
    assert mg["grossGainHa"] == pytest.approx(34.60, rel=1e-2)
    assert mg["grossLossHa"] == pytest.approx(9.60, rel=1e-2)
    assert mg["netChangeHa"] == pytest.approx(25.00, rel=1e-2)
    assert mg["lossBreakdown"]["toWaterHa"] == pytest.approx(5.80, rel=1e-2)
    assert mg["lossBreakdown"]["toAquacultureHa"] == pytest.approx(3.80, rel=1e-2)
    assert mg["gainBreakdown"]["fromWaterHa"] == pytest.approx(18.20, rel=1e-2)
    assert mg["gainBreakdown"]["fromAquacultureHa"] == pytest.approx(4.00, rel=1e-2)
    assert mg["gainBreakdown"]["fromBareLandHa"] == pytest.approx(12.40, rel=1e-2)
    assert data["confidenceScore"] == pytest.approx(91.8, rel=1e-1)

    # 5. Data transparency
    assert data["dataSource"] == "demo_fallback"
    assert data["isRealData"] is False
