"""ReportLab PDF Generation Service for Bilingual Village Reports."""
import io
import os
import logging
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from ..core.config import settings

logger = logging.getLogger("sundarban.pdf")

# Register Bengali font if available on host or in FONT_DIR
_bengali_font_registered = False
_font_name = "Helvetica"

def _setup_fonts() -> str:
    """Check for Noto Sans Bengali font and register with ReportLab."""
    global _bengali_font_registered, _font_name
    if _bengali_font_registered:
        return _font_name

    candidate_paths = [
        settings.FONT_DIR,
        os.path.join(os.path.dirname(__file__), "..", "templates", "fonts"),
        "C:\\Windows\\Fonts",
        "/usr/share/fonts/truetype/noto",
        "/usr/share/fonts/opentype/noto",
    ]

    font_filenames = [
        "NotoSansBengali-Regular.ttf",
        "NotoSansBengali-VariableFont_wdth,wght.ttf",
        "vrinda.ttf",
        "Shonar.ttf",
    ]

    for base_dir in candidate_paths:
        if not base_dir or not os.path.exists(base_dir):
            continue
        for fname in font_filenames:
            full_path = os.path.join(base_dir, fname)
            if os.path.exists(full_path):
                try:
                    pdfmetrics.registerFont(TTFont("NotoBengali", full_path))
                    _font_name = "NotoBengali"
                    _bengali_font_registered = True
                    logger.info(f"[PDF] Registered Bengali font from: {full_path}")
                    return _font_name
                except Exception as e:
                    logger.warning(f"[PDF] Could not register font {full_path}: {e}")

    logger.info("[PDF] Bengali TTF font not found in local paths. Using standard Helvetica fallback.")
    return "Helvetica"


def generate_village_report_pdf(report: Dict[str, Any], language: str = "bn") -> bytes:
    """Generate structured bilingual PDF document using ReportLab.

    Returns raw PDF bytes.
    """
    font = _setup_fonts()
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    is_bn = language.lower() == "bn"

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName=font,
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#062f29"),
        fontBold=True,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName=font,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#16845f"),
        fontBold=True,
    )

    meta_style = ParagraphStyle(
        "ReportMeta",
        parent=styles["Normal"],
        fontName=font,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#6c817a"),
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName=font,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#062f29"),
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["BodyText"],
        fontName=font,
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#123f38"),
    )

    story = []

    # 1. Header Section
    story.append(Paragraph("SUNDARBAN BLUE CARBON · VILLAGE INTELLIGENCE REPORT", subtitle_style))
    story.append(Spacer(1, 4))
    village_title = f"{report.get('village_name', 'Village')} ({report.get('bengali_village_name', '')})"
    story.append(Paragraph(village_title, title_style))
    meta_text = (
        f"Region: {report.get('region', 'Sundarbans')} | "
        f"Period: {report.get('period', '2020–2025')} | "
        f"Date: {report.get('report_date', '')}"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#16845f"), spaceAfter=12))

    # 2. Executive Summary Box
    summary_label = "সারাংশ (Executive Summary):" if is_bn else "Executive Summary:"
    summary_content = f"<b>{summary_label}</b><br/>{report.get('summary_text', '')}"
    summary_table = Table(
        [[Paragraph(summary_content, body_style)]],
        colWidths=[doc.width],
    )
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7faf7")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#d6e6de")),
            ("PADDING", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 3. KPI Statistics Grid
    lc = report.get("land_cover_findings", {})
    cd = report.get("change_findings", {})
    cb = report.get("carbon_estimate", {})

    kpi_col1 = f"<b>{lc.get('mangrove_area_ha', 0):.1f} ha</b><br/><font size='7.5' color='#6c817a'>MANGROVE COVER ({lc.get('mangrove_percentage', 0):.1f}%)</font>"
    kpi_col2 = f"<b>+{cd.get('net_change_ha', 0):.1f} ha</b><br/><font size='7.5' color='#6c817a'>5-YEAR NET CANOPY CHANGE</font>"
    kpi_col3 = f"<b>{cb.get('estimated_tons', 0):,.0f} tCO2e</b><br/><font size='7.5' color='#6c817a'>INDICATIVE CARBON STOCK</font>"

    kpi_table = Table(
        [[Paragraph(kpi_col1, body_style), Paragraph(kpi_col2, body_style), Paragraph(kpi_col3, body_style)]],
        colWidths=[doc.width / 3.0, doc.width / 3.0, doc.width / 3.0],
    )
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fcfdfc")),
            ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#d6e6de")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("PADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # 4. Key Observations
    obs_title = "মূল পর্যবেক্ষণ (Key Observations)" if is_bn else "Key Observations & Dynamics"
    story.append(Paragraph(obs_title, heading_style))

    for obs in report.get("key_observations", []):
        bullet_text = f"• <b>{obs.get('title', '')}:</b> {obs.get('detail', '')}"
        story.append(Paragraph(bullet_text, body_style))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 10))

    # 5. Recommended Actions
    act_title = "সুপারিশকৃত পদক্ষেপ (Recommended Stakeholder Actions)" if is_bn else "Recommended Stakeholder Actions"
    story.append(Paragraph(act_title, heading_style))

    for action in report.get("recommended_actions", []):
        action_text = (
            f"<b>{action.get('title', '')}</b> "
            f"<font size='8' color='#16845f'>[Priority: {action.get('priority', '').upper()} | Stakeholder: {action.get('stakeholder', '').upper()}]</font><br/>"
            f"{action.get('description', '')}"
        )
        action_table = Table(
            [[Paragraph(action_text, body_style)]],
            colWidths=[doc.width],
        )
        action_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7faf7")),
                ("LINELEFT", (0, 0), (-1, -1), 3, colors.HexColor("#16845f")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("PADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(action_table)
        story.append(Spacer(1, 6))

    # 6. Scientific Disclaimer Footer
    story.append(Spacer(1, 16))
    disclaimer_text = (
        "<font size='7' color='#6c817a'>Sundarban Blue Carbon Intelligence · "
        "Model-based indicative estimate for conservation planning. Not certified for carbon credit issuance.</font>"
    )
    story.append(Paragraph(disclaimer_text, ParagraphStyle("Disc", parent=meta_style, alignment=1)))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
