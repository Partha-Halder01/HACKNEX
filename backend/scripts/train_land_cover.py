"""Standalone Land-Cover Random Forest Model Training Pipeline.

Usage:
    python backend/scripts/train_land_cover.py
"""
import datetime
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.ml.dataset import build_training_dataset, split_training_data
from app.ml.labels import LAND_COVER_CLASSES
from app.ml.random_forest import save_model_artifact, train_random_forest
from app.ml.validation import evaluate_classifier


def run_training_pipeline() -> None:
    """Execute complete Random Forest land-cover training and validation."""
    print("=" * 70)
    print("SUNDARBAN BLUE CARBON — RANDOM FOREST TRAINING PIPELINE (PHASE 4)")
    print("=" * 70)

    # 1. Build training dataset
    print("\n[1/5] Ingesting & validating training dataset...")
    X, y, dataset_meta = build_training_dataset(samples_per_class=250, random_state=42)
    print(f"      Total Samples: {dataset_meta['totalSamples']}")
    print(f"      Feature Count: {dataset_meta['featureCount']} ({', '.join(dataset_meta['features'])})")
    print("      Class Distribution:")
    for c_name, c_info in dataset_meta["classDistribution"].items():
        print(f"        - {c_name} (Class {c_info['classId']}): {c_info['count']} samples ({c_info['percentage']}%)")

    # 2. Stratified train/validation split
    print("\n[2/5] Splitting dataset (75% Train / 25% Validation, Stratified)...")
    X_train, X_val, y_train, y_val = split_training_data(X, y, test_size=0.25, random_state=42)
    print(f"      Training Set Size:   {X_train.shape[0]} samples")
    print(f"      Validation Set Size: {X_val.shape[0]} samples")

    # 3. Train Random Forest Classifier
    print("\n[3/5] Training RandomForestClassifier (n_estimators=200, class_weight='balanced')...")
    model = train_random_forest(
        X_train=X_train,
        y_train=y_train,
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
    )
    print("      Training complete.")

    # 4. Model validation & evaluation
    print("\n[4/5] Evaluating performance on held-out validation set...")
    val_results = evaluate_classifier(model=model, X_test=X_val, y_test=y_val)
    print(f"      Overall Accuracy: {val_results['overallAccuracy'] * 100:.2f}%")
    print(f"      Macro F1-Score:   {val_results['f1Macro']:.4f}")
    print(f"      Weighted F1-Score:{val_results['f1Weighted']:.4f}")

    print("\n      Class-wise Performance:")
    for c_name, metrics in val_results["classMetrics"].items():
        print(
            f"        - {c_name:18s} | Prec: {metrics['precision']:.3f} | "
            f"Rec: {metrics['recall']:.3f} | F1: {metrics['f1']:.3f} | Support: {metrics['support']}"
        )

    print("\n      5x5 Confusion Matrix (Rows=True, Cols=Predicted):")
    cm_matrix = val_results["confusionMatrix"]["matrix"]
    cm_classes = val_results["confusionMatrix"]["classes"]
    header = "          " + "  ".join([f"{c[:4]:>6s}" for c in cm_classes])
    print(header)
    for row_idx, row in enumerate(cm_matrix):
        row_str = f"{cm_classes[row_idx][:8]:8s}: " + "  ".join([f"{val:6d}" for val in row])
        print("        " + row_str)

    print("\n      Feature Importances (Gini):")
    for feat_info in val_results["featureImportances"]:
        print(f"        - {feat_info['feature']:8s}: {feat_info['importance'] * 100:.2f}%")

    # 5. Serialize model and metadata artifacts
    print("\n[5/5] Saving model and metadata artifacts...")
    model_metadata = {
        "modelName": "RandomForestClassifier",
        "modelVersion": "rf-v1",
        "featureVersion": "sentinel2-v1",
        "classMapping": LAND_COVER_CLASSES,
        "features": dataset_meta["features"],
        "hyperparameters": {
            "nEstimators": 200,
            "randomState": 42,
            "classWeight": "balanced",
            "nJobs": -1,
        },
        "trainingDataSource": dataset_meta["trainingDataSource"],
        "totalSamples": dataset_meta["totalSamples"],
        "trainingSampleCount": int(X_train.shape[0]),
        "validationSampleCount": int(X_val.shape[0]),
        "classDistribution": dataset_meta["classDistribution"],
        "validationMetrics": val_results,
        "trainingTimestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "disclaimer": dataset_meta["disclaimer"],
    }

    models_dir = backend_dir / "models"
    joblib_path, json_path = save_model_artifact(
        model=model,
        metadata=model_metadata,
        model_dir=models_dir,
        model_name="random_forest_v1",
    )
    print(f"      Model Joblib Artifact: {joblib_path}")
    print(f"      Model Metadata JSON:   {json_path}")

    print("\n" + "=" * 70)
    print("PHASE 4 TRAINING PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 70)


if __name__ == "__main__":
    run_training_pipeline()
