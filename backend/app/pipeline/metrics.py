"""Pure-Python maths for the GEE pipeline. No Earth Engine imports here.

Binary label scheme used by the pipeline (distinct from ml.labels' 5-class ids):
    0 = non-mangrove
    1 = mangrove
"""
import hashlib
import json
import math
from typing import Any, Dict, List, Sequence

NON_MANGROVE = 0
MANGROVE = 1
BINARY_CLASSES: Dict[int, str] = {NON_MANGROVE: "Non-Mangrove", MANGROVE: "Mangrove"}

SQ_M_PER_HA = 10_000.0


def build_model_version(config: Dict[str, Any], prefix: str = "rf-gee-v1") -> str:
    """Deterministic version id from the training configuration.

    Any change to training years, sample counts, trees, seed, features or the
    reference asset yields a new version, so results from different runs are
    never compared as if they came from the same model.
    """
    canonical = json.dumps(config, sort_keys=True, default=str)
    digest = hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:8]
    return f"{prefix}-{digest}"


def metrics_from_confusion_matrix(
    matrix: Sequence[Sequence[int]],
    class_names: Dict[int, str] = BINARY_CLASSES,
) -> Dict[str, Any]:
    """Compute accuracy metrics from a confusion matrix (rows = reference, cols = predicted).

    Matches the orientation of ee.ConfusionMatrix.getInfo().
    """
    n = len(matrix)
    if n == 0 or any(len(row) != n for row in matrix):
        raise ValueError("Confusion matrix must be square and non-empty.")

    total = sum(sum(row) for row in matrix)
    if total == 0:
        raise ValueError("Confusion matrix has no samples.")

    diag = sum(matrix[i][i] for i in range(n))
    overall = diag / total

    row_sums = [sum(matrix[i]) for i in range(n)]
    col_sums = [sum(matrix[i][j] for i in range(n)) for j in range(n)]

    # Cohen's kappa
    expected = sum(row_sums[i] * col_sums[i] for i in range(n)) / (total * total)
    kappa = (overall - expected) / (1 - expected) if expected < 1 else 0.0

    per_class: List[Dict[str, Any]] = []
    f1s: List[float] = []
    for i in range(n):
        tp = matrix[i][i]
        producers = tp / row_sums[i] if row_sums[i] else 0.0  # recall
        users = tp / col_sums[i] if col_sums[i] else 0.0      # precision
        f1 = 2 * producers * users / (producers + users) if (producers + users) else 0.0
        f1s.append(f1)
        per_class.append(
            {
                "classId": i,
                "className": class_names.get(i, str(i)),
                "referenceCount": row_sums[i],
                "predictedCount": col_sums[i],
                "producersAccuracy": round(producers, 4),
                "usersAccuracy": round(users, 4),
                "f1": round(f1, 4),
            }
        )

    return {
        "sampleCount": total,
        "overallAccuracy": round(overall, 4),
        "kappa": round(kappa, 4),
        "f1Macro": round(sum(f1s) / n, 4),
        "confusionMatrix": {
            "classes": [class_names.get(i, str(i)) for i in range(n)],
            "matrix": [list(map(int, row)) for row in matrix],
            "orientation": "rows=reference, cols=predicted",
        },
        "classMetrics": per_class,
    }


def areas_from_grouped_sum(
    grouped: Dict[str, Any],
    class_names: Dict[int, str] = BINARY_CLASSES,
    group_key: str = "label",
) -> Dict[str, float]:
    """Convert the output of ee.Reducer.sum().group() over pixelArea into hectares per class.

    Input shape: {"groups": [{"label": 1, "sum": 7756000.0}, ...]}  (sum in m²)
    Output: {"Mangrove": 775.6, "Non-Mangrove": ..., "total": ...}
    """
    areas: Dict[str, float] = {name: 0.0 for name in class_names.values()}
    for group in grouped.get("groups", []):
        cid = int(group.get(group_key, -1))
        name = class_names.get(cid)
        if name is None:
            continue
        areas[name] = round(float(group.get("sum", 0.0)) / SQ_M_PER_HA, 2)
    areas["total"] = round(sum(v for k, v in areas.items() if k != "total"), 2)
    return areas


def min_mapping_unit_pixels(min_area_ha: float, scale_m: float) -> int:
    """Smallest connected patch (in pixels) that counts as real change."""
    if min_area_ha <= 0:
        return 1
    return max(1, math.ceil(min_area_ha * SQ_M_PER_HA / (scale_m * scale_m)))


def summarise_change(
    from_year: int,
    to_year: int,
    mangrove_from_ha: float,
    mangrove_to_ha: float,
    gain_ha: float,
    loss_ha: float,
    uncertain_ha: float = 0.0,
) -> Dict[str, Any]:
    """Assemble a change record. Gain/loss come from the MMU-filtered masks, so
    net change from masks can differ slightly from the raw area difference; both
    are reported so the discrepancy is visible rather than hidden."""
    return {
        "fromYear": from_year,
        "toYear": to_year,
        "mangroveFromHa": round(mangrove_from_ha, 2),
        "mangroveToHa": round(mangrove_to_ha, 2),
        "gainHa": round(gain_ha, 2),
        "lossHa": round(loss_ha, 2),
        "netChangeHa": round(gain_ha - loss_ha, 2),
        "rawAreaDifferenceHa": round(mangrove_to_ha - mangrove_from_ha, 2),
        "uncertainHa": round(uncertain_ha, 2),
        "annualisedNetChangeHa": round((gain_ha - loss_ha) / max(1, to_year - from_year), 2),
    }
