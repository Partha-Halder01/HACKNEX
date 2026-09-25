"""Comprehensive tests for Land Cover Random Forest classification, validation, and API endpoints."""
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from app.main import app
from app.ml.labels import (
    LAND_COVER_CLASSES,
    CLASS_NAMES,
    CLASS_DEFINITIONS,
    get_class_name,
    get_class_id,
    validate_class_id,
)
from app.ml.features import (
    LAND_COVER_FEATURES,
    validate_feature_dict,
    validate_feature_matrix,
    FeatureValidationError,
)
from app.ml.dataset import (
    load_training_geojson,
    build_training_dataset,
    split_training_data,
)
from app.ml.random_forest import (
    create_random_forest_model,
    train_random_forest,
    save_model_artifact,
    load_model_artifact,
)
from app.ml.validation import evaluate_classifier
from app.ml.prediction import (
    predict_sample,
    predict_batch,
    calculate_class_areas_and_distribution,
)
from app.ml.model_registry import get_model_status, get_model

client = TestClient(app)


# =====================================================================
# 1. CLASS DEFINITIONS & LABELS TESTS
# =====================================================================

def test_authoritative_class_mapping():
    """Verify exact 5 classes and ID mapping."""
    expected = {
        0: "Mangrove",
        1: "Water",
        2: "Aquaculture",
        3: "Bare Land",
        4: "Other Vegetation",
    }
    assert LAND_COVER_CLASSES == expected
    assert CLASS_NAMES == ["Mangrove", "Water", "Aquaculture", "Bare Land", "Other Vegetation"]
    assert len(CLASS_DEFINITIONS) == 5

    for cid, name in expected.items():
        assert get_class_name(cid) == name
        assert get_class_id(name) == cid
        assert validate_class_id(cid) == cid

    with pytest.raises(ValueError, match="out of bounds|Invalid class ID"):
        validate_class_id(99)

    with pytest.raises(ValueError, match="Invalid class name"):
        get_class_id("Urban")


# =====================================================================
# 2. FEATURE VALIDATION & LEAKAGE PROTECTION TESTS
# =====================================================================

def test_feature_list_and_validation():
    """Verify the 8 required spectral features and numeric validation."""
    assert LAND_COVER_FEATURES == ["B2", "B3", "B4", "B8", "B11", "B12", "NDVI", "NDWI"]

    valid_sample = {
        "B2": 450, "B3": 600, "B4": 400, "B8": 2800,
        "B11": 1000, "B12": 500, "NDVI": 0.75, "NDWI": -0.65
    }
    vec = validate_feature_dict(valid_sample)
    assert len(vec) == 8
    assert vec[6] == 0.75  # NDVI
    assert vec[7] == -0.65  # NDWI

    # Missing feature rejection
    with pytest.raises(FeatureValidationError, match="Missing required feature"):
        validate_feature_dict({"B2": 450, "B3": 600})

    # NaN / Inf rejection
    with pytest.raises(FeatureValidationError, match="invalid float"):
        validate_feature_dict({**valid_sample, "NDVI": float("nan")})

    with pytest.raises(FeatureValidationError, match="invalid float"):
        validate_feature_dict({**valid_sample, "B8": float("inf")})


def test_data_leakage_protection():
    """Verify that metadata/target columns in DataFrame raise error."""
    df_leaked = pd.DataFrame([{
        "B2": 450, "B3": 600, "B4": 400, "B8": 2800,
        "B11": 1000, "B12": 500, "NDVI": 0.75, "NDWI": -0.65,
        "classId": 0,  # Target leakage!
    }])
    with pytest.raises(FeatureValidationError, match="Data leakage detected"):
        validate_feature_matrix(df_leaked)


# =====================================================================
# 3. DATASET BUILDING & SPLITTING TESTS
# =====================================================================

def test_training_dataset_construction_and_balance():
    """Verify dataset construction from training GeoJSON."""
    geojson_data = load_training_geojson()
    assert geojson_data["type"] == "FeatureCollection"
    assert len(geojson_data["features"]) >= 15

    X, y, meta = build_training_dataset(geojson_data=geojson_data, samples_per_class=50, random_state=42)
    assert X.shape == (250, 8)  # 50 samples * 5 classes
    assert y.shape == (250,)
    assert set(np.unique(y)) == {0, 1, 2, 3, 4}

    # Stratified split
    X_train, X_val, y_train, y_val = split_training_data(X, y, test_size=0.20, random_state=42)
    assert X_train.shape[0] == 200
    assert X_val.shape[0] == 50
    assert len(np.unique(y_train)) == 5
    assert len(np.unique(y_val)) == 5


# =====================================================================
# 4. RANDOM FOREST TRAINING & PERSISTENCE TESTS
# =====================================================================

def test_random_forest_training_and_reproducibility(tmp_path):
    """Verify deterministic training, predictions, and joblib serialization."""
    X, y, meta = build_training_dataset(samples_per_class=40, random_state=42)
    X_train, X_val, y_train, y_val = split_training_data(X, y, test_size=0.25, random_state=42)

    # Train model
    model = train_random_forest(X_train, y_train, n_estimators=50, random_state=42)
    preds_1 = model.predict(X_val)

    # Re-train with same seed should yield identical predictions
    model_dup = train_random_forest(X_train, y_train, n_estimators=50, random_state=42)
    preds_2 = model_dup.predict(X_val)
    np.testing.assert_array_equal(preds_1, preds_2)

    # Save and reload artifact
    meta_dict = {"modelName": "RandomForestClassifier", "modelVersion": "rf-test"}
    joblib_p, json_p = save_model_artifact(model, meta_dict, model_dir=tmp_path, model_name="test_rf")
    assert joblib_p.exists()
    assert json_p.exists()

    loaded_model, loaded_meta = load_model_artifact(model_dir=tmp_path, model_name="test_rf")
    preds_loaded = loaded_model.predict(X_val)
    np.testing.assert_array_equal(preds_1, preds_loaded)
    assert loaded_meta["modelVersion"] == "rf-test"


# =====================================================================
# 5. VALIDATION METRICS & 5x5 CONFUSION MATRIX TESTS
# =====================================================================

def test_model_evaluation_metrics():
    """Verify evaluation returns 5x5 confusion matrix, macro F1, and feature importances."""
    X, y, meta = build_training_dataset(samples_per_class=40, random_state=42)
    X_train, X_val, y_train, y_val = split_training_data(X, y, test_size=0.25, random_state=42)
    model = train_random_forest(X_train, y_train, n_estimators=50, random_state=42)

    results = evaluate_classifier(model, X_val, y_val)
    assert results["validationStatus"] == "validated"
    assert 0.0 <= results["overallAccuracy"] <= 1.0
    assert 0.0 <= results["f1Macro"] <= 1.0

    # 5x5 Confusion matrix
    cm = results["confusionMatrix"]
    assert cm["classes"] == CLASS_NAMES
    assert len(cm["matrix"]) == 5
    assert all(len(row) == 5 for row in cm["matrix"])

    # Class-wise metrics
    for c_name in CLASS_NAMES:
        assert c_name in results["classMetrics"]
        assert "precision" in results["classMetrics"][c_name]
        assert "recall" in results["classMetrics"][c_name]
        assert "f1" in results["classMetrics"][c_name]
        assert "support" in results["classMetrics"][c_name]

    # Feature importances
    assert len(results["featureImportances"]) == 8
    feat_names = [f["feature"] for f in results["featureImportances"]]
    assert set(feat_names) == set(LAND_COVER_FEATURES)


# =====================================================================
# 6. PREDICTION, CONFIDENCE, AND AREA ESTIMATION TESTS
# =====================================================================

def test_prediction_confidence_and_uncertainty():
    """Verify single and batch predictions with confidence and uncertainty proxy."""
    X, y, meta = build_training_dataset(samples_per_class=30, random_state=42)
    model = train_random_forest(X, y, n_estimators=50, random_state=42)

    # Mangrove sample: high NIR, high NDVI
    mangrove_sample = [420, 580, 380, 2850, 950, 480, 0.76, -0.66]
    pred = predict_sample(model, mangrove_sample)
    assert pred["classId"] == 0
    assert pred["className"] == "Mangrove"
    assert 0.5 <= pred["confidence"] <= 1.0
    assert pred["uncertaintyProxy"] == pytest.approx(1.0 - pred["confidence"], rel=1e-3)
    assert "probabilities" in pred
    assert len(pred["probabilities"]) == 5

    # Batch prediction
    batch_preds = predict_batch(model, [mangrove_sample, mangrove_sample])
    assert len(batch_preds) == 2


def test_area_estimation_calculation():
    """Verify land-cover hectare area estimation."""
    preds = [0] * 60 + [1] * 25 + [2] * 8 + [3] * 4 + [4] * 3  # 100 pixels
    area_res = calculate_class_areas_and_distribution(preds, total_area_ha=1000.0)

    assert area_res["totalAreaHa"] == 1000.0
    assert area_res["classAreas"]["Mangrove"] == 600.0
    assert area_res["classAreas"]["Water"] == 250.0
    assert area_res["classAreas"]["Aquaculture"] == 80.0
    assert area_res["classAreas"]["Bare Land"] == 40.0
    assert area_res["classAreas"]["Other Vegetation"] == 30.0


# =====================================================================
# 7. FASTAPI ROUTE INTEGRATION TESTS
# =====================================================================

def test_api_land_cover_endpoints():
    """Verify all /api/land-cover/* FastAPI endpoints."""
    # 1. Main land-cover distribution
    res_dist = client.get("/api/land-cover?village_id=gosaba&year=2025")
    assert res_dist.status_code == 200
    data_dist = res_dist.json()
    assert data_dist["villageId"] == "gosaba"
    assert data_dist["year"] == 2025
    assert len(data_dist["distribution"]) == 5
    assert "modelName" in data_dist
    assert "modelVersion" in data_dist

    # 2. Model status
    res_status = client.get("/api/land-cover/model-status")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert "loaded" in data_status
    assert data_status["modelName"] == "RandomForestClassifier"
    assert data_status["featureCount"] == 8
    assert data_status["classCount"] == 5

    # 3. Model validation metrics
    res_val = client.get("/api/land-cover/validation?village_id=gosaba&year=2025")
    assert res_val.status_code == 200
    data_val = res_val.json()
    assert "overallAccuracy" in data_val
    assert "confusionMatrix" in data_val
    assert len(data_val["confusionMatrix"]["matrix"]) == 5
    assert "classMetrics" in data_val
    assert "featureImportances" in data_val

    # 4. Land-cover preview GeoJSON
    res_prev = client.get("/api/land-cover/preview?village_id=gosaba&year=2025")
    assert res_prev.status_code == 200
    data_prev = res_prev.json()
    assert data_prev["villageId"] == "gosaba"
    assert "geojson" in data_prev
    assert data_prev["geojson"]["type"] == "FeatureCollection"
    assert len(data_prev["geojson"]["features"]) > 0


def test_api_land_cover_validation_and_errors():
    """Verify 422 error on missing village parameter."""
    res_missing = client.get("/api/land-cover")
    assert res_missing.status_code == 422
