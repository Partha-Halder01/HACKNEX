"""Model validation, confusion matrix extraction, and performance evaluation."""
import logging
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.ensemble import RandomForestClassifier

from .features import LAND_COVER_FEATURES, validate_feature_matrix
from .labels import CLASS_NAMES, LAND_COVER_CLASSES

logger = logging.getLogger("sundarban.ml.validation")


def evaluate_classifier(
    model: RandomForestClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> Dict[str, Any]:
    """Calculate comprehensive classification metrics, 5x5 confusion matrix, and feature importances.

    Returns:
        Dictionary containing overall metrics, class-wise metrics, confusion matrix, and feature importances.
    """
    X_mat = validate_feature_matrix(X_test)
    y_true = np.asarray(y_test, dtype=np.int64)

    if len(y_true) == 0:
        return {
            "validationStatus": "insufficient_samples",
            "overallAccuracy": 0.0,
            "f1Macro": 0.0,
            "f1Weighted": 0.0,
            "confusionMatrix": {"classes": CLASS_NAMES, "matrix": [[0]*5 for _ in range(5)]},
            "classMetrics": {},
            "featureImportances": [],
        }

    # Generate predictions
    y_pred = model.predict(X_mat)

    # Core scores
    acc = float(accuracy_score(y_true, y_pred))
    prec_macro = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    # 5x5 Confusion Matrix with fixed 0..4 class labels
    labels_order = list(range(len(CLASS_NAMES)))
    cm = confusion_matrix(y_true, y_pred, labels=labels_order)
    confusion_matrix_data = {
        "classes": CLASS_NAMES,
        "matrix": cm.tolist(),
    }

    # Per-class precision, recall, F1, and support
    report = classification_report(
        y_true,
        y_pred,
        labels=labels_order,
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )

    class_metrics: Dict[str, Dict[str, Any]] = {}
    for name in CLASS_NAMES:
        cls_data = report.get(name, {})
        class_metrics[name] = {
            "precision": round(float(cls_data.get("precision", 0.0)), 4),
            "recall": round(float(cls_data.get("recall", 0.0)), 4),
            "f1": round(float(cls_data.get("f1-score", 0.0)), 4),
            "support": int(cls_data.get("support", 0)),
        }

    # Feature importances
    importances = model.feature_importances_
    feature_importances: List[Dict[str, Any]] = []
    for feat_name, imp in sorted(zip(LAND_COVER_FEATURES, importances), key=lambda x: x[1], reverse=True):
        feature_importances.append({
            "feature": feat_name,
            "importance": round(float(imp), 4),
        })

    return {
        "validationStatus": "validated",
        "sampleCount": int(len(y_true)),
        "overallAccuracy": round(acc, 4),
        "precisionMacro": round(prec_macro, 4),
        "recallMacro": round(rec_macro, 4),
        "f1Macro": round(f1_macro, 4),
        "f1Weighted": round(f1_weighted, 4),
        "confusionMatrix": confusion_matrix_data,
        "classMetrics": class_metrics,
        "featureImportances": feature_importances,
    }
