"""Orchestration: request → observations (live GEE or demo) → full analytics bundle."""
import copy
import logging
import threading
import uuid
from collections import OrderedDict
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from ..core.config import settings
from . import demo_engine
from .carbon import area_uncertainty_pct, carbon_change, carbon_stock, methodology as carbon_methodology
from .narrative import build_narrative
from .projection import project_scenarios
from . import progress
from .reliability import assess as assess_reliability
from .request import (
    MAX_RADIUS_KM,
    MAX_WINDOW_DAYS,
    MIN_DATE,
    MIN_RADIUS_KM,
    MIN_SPAN_DAYS,
    MIN_WINDOW_DAYS,
    SUNDARBAN_BBOX,
    AnalysisRequest,
)

logger = logging.getLogger("sundarban.analysis.service")

_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_cache_lock = threading.Lock()

# Forest default: near villages (e.g. Gosaba, 22.165/88.805) the model over-counts mangrove.
DEFAULT_POINT = {"lat": 22.1, "lon": 88.85, "name": "Sajnekhali forest"}


def _gee_ready() -> Tuple[bool, str, Optional[str]]:
    from ..geospatial.gee_client import initialize_gee

    return initialize_gee()


def analysis_capabilities() -> Dict[str, Any]:
    ok, code, msg = _gee_ready()
    today = date.today()
    return {
        "liveEngine": ok,
        "engineStatus": code,
        "engineMessage": msg or "Earth Engine connected: analyses use live Sentinel-2 data.",
        "geminiConfigured": bool(settings.GEMINI_API_KEY),
        "limits": {
            "minDate": MIN_DATE.isoformat(),
            "maxDate": today.isoformat(),
            "minSpanDays": MIN_SPAN_DAYS,
            "minRadiusKm": MIN_RADIUS_KM,
            "maxRadiusKm": MAX_RADIUS_KM,
            "minWindowDays": MIN_WINDOW_DAYS,
            "maxWindowDays": MAX_WINDOW_DAYS,
        },
        "defaults": {
            **DEFAULT_POINT,
            "radiusKm": 2.0,
            "startDate": "2020-01-01",
            # Latest completed Jan–Mar dry season, to match the start season.
            "endDate": date(today.year if today >= date(today.year, 3, 31) else today.year - 1, 3, 31).isoformat(),
            "windowDays": 90,
        },
        "sundarbanBbox": SUNDARBAN_BBOX,
    }


def _observe(req: AnalysisRequest, report: progress.Reporter = progress._noop) -> Tuple[Dict[str, Any], List[str]]:
    warnings: List[str] = []
    ok, code, _ = _gee_ready()
    if ok:
        from .gee_engine import GeeAnalysisError, observe as gee_observe

        try:
            return gee_observe(req, report=report), warnings
        except GeeAnalysisError:
            raise
        except Exception as e:  # keep the dashboard usable; say loudly that it fell back
            logger.exception("[Analysis] Live Earth Engine run failed; using demo engine.")
            warnings.append(f"Live Earth Engine run failed ({type(e).__name__}); showing demo data instead.")
    report("demo", plan=progress.PLAN_DEMO)
    return demo_engine.observe(req), warnings


def _pct(part: float, whole: float) -> float:
    return round(100.0 * part / whole, 1) if whole > 0 else 0.0


def build_bundle(req: AnalysisRequest, obs: Dict[str, Any], warnings: List[str]) -> Dict[str, Any]:
    timeline = []
    for row in obs["timeline"]:
        timeline.append({**row, "mangrovePct": _pct(row["mangroveHa"], row["totalHa"])})
    if len(timeline) < 2:
        raise ValueError("Need both a start and an end observation.")
    start, end = timeline[0], timeline[-1]

    ch = obs["change"]
    change = {
        **ch,
        "netChangeHa": round(ch["gainHa"] - ch["lossHa"], 2),
        "rawAreaDifferenceHa": round(end["mangroveHa"] - start["mangroveHa"], 2),
        "annualNetChangeHa": round((ch["gainHa"] - ch["lossHa"]) / max(req.span_years, 1e-6), 2),
        "percentChange": _pct(end["mangroveHa"] - start["mangroveHa"], start["mangroveHa"]),
    }

    area_unc = area_uncertainty_pct(obs.get("accuracy"))
    series = []
    for row in timeline:
        st = carbon_stock(row["mangroveHa"], area_unc)
        series.append(
            {
                "key": row["key"],
                "label": row["label"],
                "midDate": row["midDate"],
                "decimalYear": row["decimalYear"],
                "carbonMgC": st["carbonMgC"],
                "carbonLowMgC": st["carbonRangeMgC"][0],
                "carbonHighMgC": st["carbonRangeMgC"][1],
                "co2eMg": st["co2eMg"],
            }
        )
    carbon = {
        "areaUncertaintyPct": area_unc,
        "start": carbon_stock(start["mangroveHa"], area_unc),
        "end": carbon_stock(end["mangroveHa"], area_unc),
        "change": carbon_change(
            start["mangroveHa"], end["mangroveHa"], ch["gainHa"], ch["lossHa"], ch.get("uncertainHa", 0.0),
            req.span_years, area_unc,
        ),
        "series": series,
        "methodology": carbon_methodology(),
    }

    projection = project_scenarios(
        [(row["decimalYear"], row["mangroveHa"]) for row in timeline],
        ch["gainHa"],
        ch["lossHa"],
        req.span_years,
        req.aoi_area_ha,
        area_unc,
    )

    real = bool(obs["isRealData"])
    bundle = {
        "request": req.to_dict(),
        "dataSource": {
            "id": obs["dataSource"],
            "isRealData": real,
            "label": "Live Sentinel-2 + Random Forest" if real else "Demo (synthetic)",
            "modelVersion": obs["modelVersion"],
            "engineNote": obs.get("engineNote"),
        },
        "warnings": warnings + list(obs.get("notes") or []),
        "summary": {
            "start": {k: start[k] for k in ("label", "startDate", "endDate", "mangroveHa", "mangrovePct", "imageCount")},
            "end": {k: end[k] for k in ("label", "startDate", "endDate", "mangroveHa", "mangrovePct", "imageCount")},
        },
        "timeline": timeline,
        "change": change,
        "carbon": carbon,
        "projection": projection,
        "accuracy": obs.get("accuracy"),
        "historical": obs.get("historical"),
        "tiles": obs.get("tiles"),
        "training": obs.get("training"),
        "methodology": {
            "composite": f"Cloud-masked Sentinel-2 L2A median, {req.window_days}-day windows; dry season (Jan–Mar) for in-between years",
            "features": ["B2", "B3", "B4", "B8", "B11", "B12", "NDVI", "NDWI"],
            "classifier": "Random Forest (2 classes: mangrove / other) trained on stable CGMD-AFCC30 pixels",
            "change": f"Post-classification comparison; patches < {settings.PIPELINE_MIN_MAPPING_UNIT_HA} ha dropped; "
                      f"pixels with confidence < {settings.PIPELINE_CONFIDENCE_THRESHOLD} reported as uncertain",
            "scaleM": req.scale_m,
        },
    }
    bundle["reliability"] = assess_reliability(req, bundle)
    return bundle


def run_analysis(req: AnalysisRequest, progress_id: Optional[str] = None) -> Dict[str, Any]:
    """Validate, observe (cached), and assemble the bundle with narrative.

    With `progress_id`, each real step is reported for GET /analysis/progress/{id}.
    """
    report = progress.start(progress_id)
    try:
        report("check")
        warnings = req.validate()
        key = req.cache_key()
        with _cache_lock:
            cached = _cache.get(key)
            if cached is not None:
                _cache.move_to_end(key)
        if cached is not None:
            report("cache", plan=progress.PLAN_CACHED)
        else:
            if not _gee_ready()[0]:
                report("check", plan=progress.PLAN_DEMO)
            obs, engine_warnings = _observe(req, report)
            report("carbon")
            cached = build_bundle(req, obs, engine_warnings)
            with _cache_lock:
                _cache[key] = cached
                while len(_cache) > settings.ANALYSIS_CACHE_SIZE:
                    _cache.popitem(last=False)

        report("summary")
        bundle = copy.deepcopy(cached)
        bundle["request"]["language"] = req.language
        bundle["warnings"] = warnings + bundle["warnings"]
        bundle["analysisId"] = f"an_{key}_{uuid.uuid4().hex[:6]}"
        bundle["generatedAt"] = datetime.now(timezone.utc).isoformat()
        narrative, evidence = build_narrative(bundle, req.use_ai)
        bundle["narrative"] = narrative
        bundle["evidence"] = evidence
    except Exception as e:
        progress.finish(progress_id, error=str(e))
        raise
    progress.finish(progress_id)
    return bundle


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()
