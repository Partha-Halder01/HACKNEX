"""Warm the slow parts right after the server starts, in a background thread.

Cold start costs ~20–45 s for Earth Engine + the Sundarbans basemap, and ~2 min
for the first live analysis. Doing that once at startup means the first visitor
(e.g. a judge opening the dashboard) gets the default view immediately.
Failures are only logged: the API works the same without the warm-up.
"""
import logging
import threading
import time
from datetime import date

logger = logging.getLogger("sundarban.analysis.warmup")


def _warm() -> None:
    t0 = time.time()
    try:
        from ..geospatial.gee_client import initialize_gee

        ok, code, _ = initialize_gee()
        if not ok:
            logger.info(f"[Warmup] Earth Engine not available ({code}); nothing to warm.")
            return

        from .basemap import get_basemap

        get_basemap()
        print(f"[Warmup] Earth Engine + basemap ready after {time.time() - t0:.0f}s", flush=True)

        from .request import AnalysisRequest
        from .service import analysis_capabilities, run_analysis

        d = analysis_capabilities()["defaults"]
        req = AnalysisRequest(
            lat=d["lat"],
            lon=d["lon"],
            radius_km=d["radiusKm"],
            start_date=date.fromisoformat(d["startDate"]),
            end_date=date.fromisoformat(d["endDate"]),
            window_days=d["windowDays"],
        )
        print("[Warmup] Pre-computing the default analysis in the background (~2 min)...", flush=True)
        run_analysis(req)  # fills the in-memory cache
        print(f"[Warmup] Default analysis ready after {time.time() - t0:.0f}s - first visitors get instant results", flush=True)
    except Exception as e:  # never let warm-up affect the server
        logger.warning(f"[Warmup] Skipped: {type(e).__name__}: {e}")


def start_warmup() -> threading.Thread:
    thread = threading.Thread(target=_warm, name="mangrovelens-warmup", daemon=True)
    thread.start()
    return thread
