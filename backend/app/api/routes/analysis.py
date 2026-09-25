"""Public analysis endpoints: pick a location + dates, get every analytic back."""
import json
import logging
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from ...analysis import AnalysisRequest, AnalysisRequestError, analysis_capabilities, run_analysis
from ...core.config import settings
from ...db.mongodb import get_database

logger = logging.getLogger("sundarban.api.analysis")
router = APIRouter(prefix="/analysis", tags=["Analysis"])


class AnalysisRunBody(BaseModel):
    lat: float
    lon: float
    radiusKm: float = Field(default=3.0)
    startDate: date
    endDate: date
    windowDays: int = Field(default=90)
    language: Literal["en", "bn"] = "en"
    useAi: bool = False


class FieldPointBody(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    observedClass: Literal["mangrove", "other"]
    observedOn: date
    observer: Optional[str] = Field(default=None, max_length=80)
    note: Optional[str] = Field(default=None, max_length=500)
    analysisId: Optional[str] = Field(default=None, max_length=64)


@router.get("/capabilities")
async def get_capabilities() -> Dict[str, Any]:
    """What the analysis can do right now (live vs demo engine, limits, defaults)."""
    return await run_in_threadpool(analysis_capabilities)


@router.get("/basemap")
async def get_basemap(year: Optional[int] = None) -> Dict[str, Any]:
    """Sentinel-2 dry-season photo of the Sundarbans as map tiles (Earth Engine).

    Returns {"available": false, "reason": ...} when Earth Engine is offline, so
    the page can fall back to another background without treating it as an error.
    """
    from ...analysis.basemap import get_basemap as build

    return await run_in_threadpool(build, year)


@router.post("/run")
async def post_run(body: AnalysisRunBody) -> Dict[str, Any]:
    """Run the full analysis (area, change, carbon ±, scenarios, accuracy, narrative)."""
    req = AnalysisRequest(
        lat=body.lat,
        lon=body.lon,
        radius_km=body.radiusKm,
        start_date=body.startDate,
        end_date=body.endDate,
        window_days=body.windowDays,
        language=body.language,
        use_ai=body.useAi,
    )
    try:
        bundle = await run_in_threadpool(run_analysis, req)
    except AnalysisRequestError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        from ...analysis.gee_engine import GeeAnalysisError

        if isinstance(e, GeeAnalysisError):
            raise HTTPException(status_code=422, detail=str(e))
        logger.exception("[Analysis] Run failed")
        raise HTTPException(status_code=500, detail="Analysis failed unexpectedly. Check the server log.")

    db = get_database()
    if db is not None:
        try:
            doc = {
                "analysisId": bundle["analysisId"],
                "request": bundle["request"],
                "dataSource": bundle["dataSource"]["id"],
                "isRealData": bundle["dataSource"]["isRealData"],
                "modelVersion": bundle["dataSource"]["modelVersion"],
                "summary": bundle["summary"],
                "change": bundle["change"],
                "carbonEnd": {k: bundle["carbon"]["end"][k] for k in ("carbonMgC", "co2eMg", "uncertaintyPct")},
                "createdAt": bundle["generatedAt"],
            }
            await db["analysis_runs"].insert_one(doc)
        except Exception as e:  # persistence is best-effort; never block the answer
            logger.warning(f"[Analysis] Could not store run: {e}")
    return bundle


def _field_points_path() -> Path:
    path = Path(settings.FIELD_POINTS_PATH)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[3] / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@router.post("/field-points", status_code=201)
async def post_field_point(body: FieldPointBody) -> Dict[str, Any]:
    """Record a ground check (what someone saw on the spot) for later validation."""
    record = {**body.model_dump(mode="json"), "createdAt": datetime.now(timezone.utc).isoformat()}
    db = get_database()
    if db is not None:
        await db["field_points"].insert_one(dict(record))
        storage = "mongodb"
    else:
        with _field_points_path().open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        storage = "file"
    return {"saved": True, "storage": storage, "point": record}


@router.get("/field-points")
async def get_field_points(limit: int = 200) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 1000))
    db = get_database()
    if db is not None:
        cursor = db["field_points"].find({}, {"_id": 0}).sort("createdAt", -1).limit(limit)
        return [doc async for doc in cursor]
    path = _field_points_path()
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in reversed(lines[-limit:]) if line.strip()]
