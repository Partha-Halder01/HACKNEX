"""Deterministic stand-in observations used when Earth Engine is not connected.

The numbers are synthetic: seeded from the location so the same request always
gives the same answer, shaped like the real engine's output so every downstream
step (carbon, projection, narrative, UI) runs unchanged. They are always
labelled `isRealData: False` and must never be presented as measurements.
Accuracy and historical CGMD context are left empty on purpose — inventing
those would look like evidence.
"""
import hashlib
import random
from typing import Any, Dict, List

from .request import AnalysisRequest

DATA_SOURCE = "demo_synthetic"
MODEL_VERSION = "demo-v1"


def _rng(req: AnalysisRequest) -> random.Random:
    seed = hashlib.sha1(f"{req.lat:.3f},{req.lon:.3f},{req.radius_km:.2f}".encode()).hexdigest()
    return random.Random(int(seed[:12], 16))


def _mangrove_fraction(req: AnalysisRequest, rng: random.Random) -> float:
    if not req.inside_sundarban:
        return rng.uniform(0.0, 0.04)
    # Denser forest towards the sea-facing south of the delta, sparser near settled islands.
    southness = min(1.0, max(0.0, (22.35 - req.lat) / 0.8))
    return min(0.9, max(0.05, 0.25 + 0.5 * southness + rng.uniform(-0.08, 0.08)))


def observe(req: AnalysisRequest) -> Dict[str, Any]:
    rng = _rng(req)
    aoi = req.aoi_area_ha
    periods = req.periods()
    t0 = periods[0]["decimalYear"]

    a0 = aoi * _mangrove_fraction(req, rng)
    net_rate = rng.uniform(-0.015, 0.008)      # fraction of mangrove area per year
    loss_rate = rng.uniform(0.006, 0.018)      # gross loss, fraction per year
    low_conf_frac = rng.uniform(0.03, 0.06)

    timeline: List[Dict[str, Any]] = []
    for i, p in enumerate(periods):
        dt = p["decimalYear"] - t0
        noise = 1.0 if i in (0, len(periods) - 1) else 1.0 + rng.gauss(0.0, 0.004)
        mangrove = min(aoi, max(0.0, a0 * (1.0 + net_rate) ** dt * noise))
        timeline.append(
            {
                **p,
                "mangroveHa": round(mangrove, 2),
                "nonMangroveHa": round(aoi - mangrove, 2),
                "totalHa": round(aoi, 2),
                "lowConfidenceHa": round(low_conf_frac * aoi, 2),
                "imageCount": None,
            }
        )

    start_ha, end_ha = timeline[0]["mangroveHa"], timeline[-1]["mangroveHa"]
    net = end_ha - start_ha
    loss = loss_rate * a0 * req.span_years
    gain = loss + net
    if gain < 0.1 * loss:
        gain = 0.1 * loss
        loss = gain - net
    mean_area = (start_ha + end_ha) / 2.0

    return {
        "dataSource": DATA_SOURCE,
        "isRealData": False,
        "modelVersion": MODEL_VERSION,
        "engineNote": (
            "DEMO MODE — Earth Engine is not connected, so these values are synthetic and "
            "location-seeded. They show how the dashboard works; they are not measurements."
        ),
        "timeline": timeline,
        "change": {
            "gainHa": round(gain, 2),
            "lossHa": round(loss, 2),
            "uncertainHa": round(0.01 * mean_area, 2),
            "stableMangroveHa": round(max(0.0, start_ha - loss), 2),
        },
        "accuracy": None,
        "historical": None,
        "tiles": None,
        "training": None,
    }
