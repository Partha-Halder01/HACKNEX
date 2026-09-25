"""Bilingual village reports route with JSON and PDF outputs."""
from fastapi import APIRouter, Path, Query, Response
from ...schemas.reports import VillageReport
from ...services.reports import get_village_report
from ...services.pdf import generate_village_report_pdf

router = APIRouter(tags=["Village Reports"])


@router.get("/villages/{village_id}/reports", response_model=VillageReport)
async def read_village_report(
    village_id: str = Path(..., description="Village ID (e.g., gosaba)"),
    lang: str = Query(default="bn", description="Report language: 'bn' (Bengali) or 'en' (English)"),
    use_gemini: bool = Query(default=False, description="Enable Gemini AI observation enhancement"),
) -> VillageReport:
    """Retrieve structured bilingual village environmental findings and actions (JSON)."""
    return await get_village_report(village_id=village_id, lang=lang, use_gemini=use_gemini)


@router.get("/villages/{village_id}/reports/pdf")
async def export_village_report_pdf(
    village_id: str = Path(..., description="Village ID (e.g., gosaba)"),
    lang: str = Query(default="bn", description="Report language: 'bn' (Bengali) or 'en' (English)"),
    use_gemini: bool = Query(default=False, description="Enable Gemini AI observation enhancement"),
):
    """Generate and stream a structured bilingual PDF environmental report."""
    report_data = await get_village_report(village_id=village_id, lang=lang, use_gemini=use_gemini)
    # Dump Pydantic model to dict for PDF generator
    report_dict = report_data.model_dump(by_alias=False)
    pdf_bytes = generate_village_report_pdf(report=report_dict, language=lang)

    filename = f"{village_id}-blue-carbon-report-{lang}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )
