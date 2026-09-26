"""Live progress of a running analysis, so the page can show real steps.

The browser sends a random `progressId` with POST /analysis/run and polls
GET /analysis/progress/{id}. The engine calls `report(stage, ...)` as it moves
through the real work; nothing here is simulated.
"""
import threading
import time
from typing import Any, Callable, Dict, List, Optional

# Step plans (stable ids; the page has the EN/BN labels).
PLAN_LIVE = ["check", "train", "test", "photos", "areacheck", "change", "tiles", "history", "carbon", "summary"]
PLAN_DEMO = ["check", "demo", "carbon", "summary"]
PLAN_CACHED = ["check", "cache", "summary"]

_TTL_SECONDS = 15 * 60
_jobs: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()

Reporter = Callable[..., None]


def _noop(*_a: Any, **_k: Any) -> None:
    return None


def _cleanup(now: float) -> None:
    for pid in [p for p, j in _jobs.items() if now - j["updatedAt"] > _TTL_SECONDS]:
        _jobs.pop(pid, None)


def start(pid: Optional[str]) -> Reporter:
    """Register a job and return its reporter (a no-op when no id was given)."""
    if not pid:
        return _noop
    now = time.time()
    with _lock:
        _cleanup(now)
        _jobs[pid] = {"plan": list(PLAN_LIVE), "history": [], "detail": None, "done": False, "error": None, "startedAt": now, "updatedAt": now}

    def report(stage: str, *, detail: Optional[Dict[str, Any]] = None, plan: Optional[List[str]] = None) -> None:
        t = time.time()
        with _lock:
            job = _jobs.get(pid)
            if job is None:
                return
            if plan is not None:
                job["plan"] = list(plan)
            hist = job["history"]
            if not hist or hist[-1]["stage"] != stage:
                if hist:
                    hist[-1]["endedAt"] = t
                hist.append({"stage": stage, "startedAt": t, "endedAt": None})
            job["detail"] = detail
            job["updatedAt"] = t

    return report


def finish(pid: Optional[str], error: Optional[str] = None) -> None:
    if not pid:
        return
    t = time.time()
    with _lock:
        job = _jobs.get(pid)
        if job is None:
            return
        if job["history"] and job["history"][-1]["endedAt"] is None:
            job["history"][-1]["endedAt"] = t
        job["done"] = True
        job["error"] = error
        job["detail"] = None
        job["updatedAt"] = t


def snapshot(pid: str) -> Optional[Dict[str, Any]]:
    """Plan with per-step status (done / active / pending) and seconds taken."""
    with _lock:
        job = _jobs.get(pid)
        if job is None:
            return None
        now = time.time()
        seen = {h["stage"]: h for h in job["history"]}
        current = job["history"][-1]["stage"] if job["history"] and not job["done"] else None
        steps = []
        for sid in job["plan"]:
            h = seen.get(sid)
            if h is None:
                status, secs = "pending", None
            elif sid == current:
                status, secs = "active", round(now - h["startedAt"], 1)
            else:
                status, secs = "done", round((h["endedAt"] or now) - h["startedAt"], 1)
            steps.append({"id": sid, "status": status, "seconds": secs})
        return {
            "steps": steps,
            "current": current,
            "detail": job["detail"],
            "done": job["done"],
            "error": job["error"],
            "elapsed": round((job["updatedAt"] if job["done"] else now) - job["startedAt"], 1),
        }
