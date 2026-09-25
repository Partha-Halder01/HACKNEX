"""FastAPI router for Phase 7 Environmental Intelligence, Confidence, and Decision Support."""
from fastapi import APIRouter, Query
from ...schemas.intelligence import (
    EnvironmentalIntelligenceResponse,
    IntelligenceSummaryResponse,
    FieldVerificationResponse,
    EvidenceListResponse,
)
from ...services.intelligence import (
    get_environmental_intelligence_service,
    get_intelligence_summary_service,
    get_field_verification_service,
    get_evidence_list_service,
)

router = APIRouter(prefix="/intelligence", tags=["AI Environmental Intelligence"])


@router.get("", response_model=EnvironmentalIntelligenceResponse)
async def read_environmental_intelligence(
    village_id: str = Query(..., description="Pilot village identifier (e.g. 'gosaba', 'satjelia')"),
    year: int = Query(default=2025, description="Primary observation year"),
    from_year: int = Query(default=2020, description="Baseline comparison year"),
    to_year: int = Query(default=2025, description="Observed comparison year"),
    lang: str = Query(default="en", description="Language code: 'en' (English) or 'bn' (Bengali)"),
    use_gemini: bool = Query(default=False, description="Enable Gemini AI structured interpretation"),
) -> EnvironmentalIntelligenceResponse:
    """Retrieve evidence-grounded AI environmental intelligence, multi-component confidence, and decision support."""
    return await get_environmental_intelligence_service(
        village_id=village_id,
        year=year,
        from_year=from_year,
        to_year=to_year,
        lang=lang,
        use_gemini=use_gemini,
    )


@router.get("/summary", response_model=IntelligenceSummaryResponse)
async def read_intelligence_summary(
    village_id: str = Query(..., description="Pilot village identifier"),
    year: int = Query(default=2025, description="Observation year"),
) -> IntelligenceSummaryResponse:
    """Retrieve high-level intelligence summary and key decision flags."""
    return await get_intelligence_summary_service(village_id=village_id, year=year)


@router.get("/verification", response_model=FieldVerificationResponse)
async def read_field_verification(
    village_id: str = Query(..., description="Pilot village identifier"),
    year: int = Query(default=2025, description="Observation year"),
) -> FieldVerificationResponse:
    """Retrieve deterministic field verification priorities, survey flags, and reason codes."""
    return await get_field_verification_service(village_id=village_id, year=year)


@router.get("/evidence", response_model=EvidenceListResponse)
async def read_evidence_list(
    village_id: str = Query(..., description="Pilot village identifier"),
    year: int = Query(default=2025, description="Observation year"),
) -> EvidenceListResponse:
    """Retrieve atomic deterministic evidence registry items for auditability."""
    return await get_evidence_list_service(village_id=village_id, year=year)
