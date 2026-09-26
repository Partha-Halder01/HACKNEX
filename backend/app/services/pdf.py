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
    Image,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from ..core.config import settings

logger = logging.getLogger("sundarban.pdf")

# Register Bengali font if available on host or in FONT_DIR
_bengali_font_registered = False
_font_name = "Helvetica"

LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "brand", "mangrovelens-logo.png")


def _logo(width_pt: float = 150) -> Optional[Image]:
    """MangroveLens logo for the report header (None if the file is missing)."""
    if not os.path.exists(LOGO_PATH):
        return None
    img = Image(LOGO_PATH, width=width_pt, height=width_pt * 298 / 836)
    img.hAlign = "LEFT"
    return img


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
    logo = _logo()
    if logo:
        story.extend([logo, Spacer(1, 4)])
    story.append(Paragraph("MANGROVELENS · VILLAGE INTELLIGENCE REPORT", subtitle_style))
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
        "<font size='7' color='#6c817a'>MangroveLens Intelligence · "
        "Model-based indicative estimate for conservation planning. Not certified for carbon credit issuance.</font>"
    )
    story.append(Paragraph(disclaimer_text, ParagraphStyle("Disc", parent=meta_style, alignment=1)))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_analysis_bundle_pdf(bundle: Dict[str, Any], language: str = "en") -> bytes:
    """Generate structured bilingual PDF document for an AnalysisBundle using ReportLab.

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
        "AnalysisReportTitle",
        parent=styles["Normal"],
        fontName=font,
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#062f29"),
        fontBold=True,
    )

    subtitle_style = ParagraphStyle(
        "AnalysisReportSubtitle",
        parent=styles["Normal"],
        fontName=font,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#16845f"),
        fontBold=True,
    )

    meta_style = ParagraphStyle(
        "AnalysisReportMeta",
        parent=styles["Normal"],
        fontName=font,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#6c817a"),
    )

    heading_style = ParagraphStyle(
        "AnalysisSectionHeading",
        parent=styles["Heading2"],
        fontName=font,
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#062f29"),
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "AnalysisReportBody",
        parent=styles["BodyText"],
        fontName=font,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#123f38"),
    )

    req = bundle.get("request", {})
    summary = bundle.get("summary", {})
    change = bundle.get("change", {})
    carbon = bundle.get("carbon", {})
    narrative = bundle.get("narrative", {})
    accuracy = bundle.get("accuracy", {})

    lat = float(req.get("lat", 22.1))
    lon = float(req.get("lon", 88.85))
    radius_km = float(req.get("radiusKm", 2.0))
    start_date = req.get("startDate", "2020-01-01")
    end_date = req.get("endDate", "2026-03-31")
    aoi_ha = float(req.get("aoiAreaHa", 1256.6))
    analysis_id = bundle.get("analysisId", "sundarban-analysis")

    net_change_ha = float(change.get("netChangeHa", 0.0))
    pct_change = float(change.get("percentChange", 0.0))
    stable_ha = float(change.get("stableMangroveHa", 0.0))
    gain_ha = float(change.get("gainHa", 0.0))
    loss_ha = float(change.get("lossHa", 0.0))

    end_summary = summary.get("end", {})
    start_summary = summary.get("start", {})
    mangrove_end_ha = float(end_summary.get("mangroveHa") or end_summary.get("forestHa") or 0.0)
    mangrove_start_ha = float(start_summary.get("mangroveHa") or start_summary.get("forestHa") or 0.0)
    mangrove_end_pct = float(end_summary.get("mangrovePct") or end_summary.get("forestPct") or 0.0)

    aoi_ha = float(req.get("aoiAreaHa") or 1256.6)
    non_mangrove_start_ha = max(0.0, aoi_ha - mangrove_start_ha)
    non_mangrove_end_ha = max(0.0, aoi_ha - mangrove_end_ha)
    non_mangrove_diff = non_mangrove_end_ha - non_mangrove_start_ha
    non_mangrove_pct = (non_mangrove_diff / non_mangrove_start_ha * 100) if non_mangrove_start_ha > 0 else 0.0

    end_carbon = carbon.get("end", {})
    carbon_change = carbon.get("change", {})
    total_carbon_mg = float(end_carbon.get("carbonMgC", 0.0))
    co2e_mg = float(end_carbon.get("co2eMg", 0.0))
    co2e_change_mg = float(carbon_change.get("co2eChangeMg", 0.0))

    story = []

    # 1. Header Section
    header_tag = "SUNDARBAN BLUE CARBON OBSERVATORY · SATELLITE ANALYSIS REPORT"
    if is_bn:
        header_tag = "সুন্দরবন ব্লু কার্বন মানমন্দির · স্যাটেলাইট বিশ্লেষণ প্রতিবেদন"
    logo = _logo()
    if logo:
        story.extend([logo, Spacer(1, 4)])
    story.append(Paragraph(header_tag, subtitle_style))
    story.append(Spacer(1, 3))

    report_title = (
        f"Ecosystem Blue Carbon & Canopy Assessment"
        if not is_bn
        else f"বাস্তুতন্ত্র ব্লু কার্বন ও ম্যানগ্রোভ ক্যানোপি মূল্যায়ন"
    )
    story.append(Paragraph(report_title, title_style))

    meta_text = (
        f"<b>AOI:</b> {lat:.4f}°N, {lon:.4f}°E | "
        f"<b>Swath:</b> {radius_km:.1f} km ({aoi_ha:,.1f} ha) | "
        f"<b>Observation Epoch:</b> {start_date[:4]} – {end_date[:4]} | "
        f"<b>Sensor:</b> Sentinel-2 MSI (10m L2A)"
    )
    story.append(Paragraph(meta_text, meta_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#16845f"), spaceAfter=10))

    # 2. Executive KPI Summary Grid
    kpi_col1 = (
        f"<b>{mangrove_end_ha:,.1f} ha</b><br/>"
        f"<font size='7' color='#6c817a'>"
        f"{'বর্তমান ম্যানগ্রোভ ক্যানোপি' if is_bn else 'FINAL MANGROVE CANOPY'}"
        f"</font>"
    )
    net_prefix = "+" if net_change_ha >= 0 else ""
    net_color = "#16845f" if net_change_ha >= 0 else "#b91c1c"
    kpi_col2 = (
        f"<b><font color='{net_color}'>{net_prefix}{net_change_ha:,.1f} ha ({pct_change:+.1f}%)</font></b><br/>"
        f"<font size='7' color='#6c817a'>"
        f"{'নিট ক্যানোপি পরিবর্তন' if is_bn else 'NET CANOPY CHANGE'}"
        f"</font>"
    )
    kpi_col3 = (
        f"<b>{total_carbon_mg:,.0f} Mg C</b><br/>"
        f"<font size='7' color='#6c817a'>"
        f"{'মোট কার্বন মজুত' if is_bn else 'TOTAL CARBON STOCK'}"
        f"</font>"
    )
    co2_prefix = "+" if co2e_change_mg >= 0 else ""
    kpi_col4 = (
        f"<b>{co2e_mg:,.0f} tCO2e</b><br/>"
        f"<font size='7' color='#6c817a'>"
        f"{'বায়ুমণ্ডলীয় সমতুল্য' if is_bn else 'ATMOSPHERIC CO2e EQUIV'}"
        f"</font>"
    )

    kpi_table = Table(
        [[
            Paragraph(kpi_col1, body_style),
            Paragraph(kpi_col2, body_style),
            Paragraph(kpi_col3, body_style),
            Paragraph(kpi_col4, body_style),
        ]],
        colWidths=[doc.width / 4.0] * 4,
    )
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7faf7")),
            ("GRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#d6e6de")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # 3. Land Cover Dynamics Table
    lc_title = "ভূমি আচ্ছাদন ও ক্যানোপি গতিশীলতা" if is_bn else "Land Cover & Canopy Dynamics"
    story.append(Paragraph(lc_title, heading_style))

    if is_bn:
        table_data = [
            [
                Paragraph("<b>শ্রেণি / ল্যান্ড কভার</b>", body_style),
                Paragraph("<b>শুরুতে (ha)</b>", body_style),
                Paragraph("<b>শেষে (ha)</b>", body_style),
                Paragraph("<b>নিট শিফট</b>", body_style),
            ],
            [
                Paragraph("ম্যানগ্রোভ বন ক্যানোপি", body_style),
                Paragraph(f"{mangrove_start_ha:,.1f} ha", body_style),
                Paragraph(f"{mangrove_end_ha:,.1f} ha", body_style),
                Paragraph(f"{net_prefix}{net_change_ha:,.1f} ha ({pct_change:+.1f}%)", body_style),
            ],
            [
                Paragraph("অন্যান্য আচ্ছাদন (নদীনালা ও কাদাচর)", body_style),
                Paragraph(f"{non_mangrove_start_ha:,.1f} ha", body_style),
                Paragraph(f"{non_mangrove_end_ha:,.1f} ha", body_style),
                Paragraph(f"{non_mangrove_diff:+,.1f} ha ({non_mangrove_pct:+.1f}%)", body_style),
            ],
            [
                Paragraph("সর্বমোট পর্যবেক্ষণ এলাকা (AOI)", body_style),
                Paragraph(f"{aoi_ha:,.1f} ha", body_style),
                Paragraph(f"{aoi_ha:,.1f} ha", body_style),
                Paragraph("0.0 ha (0.0%)", body_style),
            ],
        ]
    else:
        table_data = [
            [
                Paragraph("<b>Classification Category</b>", body_style),
                Paragraph("<b>Baseline Area</b>", body_style),
                Paragraph("<b>Current Area</b>", body_style),
                Paragraph("<b>Net Shift</b>", body_style),
            ],
            [
                Paragraph("Mangrove Forest Canopy", body_style),
                Paragraph(f"{mangrove_start_ha:,.1f} ha", body_style),
                Paragraph(f"{mangrove_end_ha:,.1f} ha", body_style),
                Paragraph(f"{net_prefix}{net_change_ha:,.1f} ha ({pct_change:+.1f}%)", body_style),
            ],
            [
                Paragraph("Non-Mangrove (Water, Mudflats & Matrix)", body_style),
                Paragraph(f"{non_mangrove_start_ha:,.1f} ha", body_style),
                Paragraph(f"{non_mangrove_end_ha:,.1f} ha", body_style),
                Paragraph(f"{non_mangrove_diff:+,.1f} ha ({non_mangrove_pct:+.1f}%)", body_style),
            ],
            [
                Paragraph("Total Monitored Boundary (AOI)", body_style),
                Paragraph(f"{aoi_ha:,.1f} ha", body_style),
                Paragraph(f"{aoi_ha:,.1f} ha", body_style),
                Paragraph("0.0 ha (0.0%)", body_style),
            ],
        ]

    lc_table = Table(table_data, colWidths=[doc.width * 0.42, doc.width * 0.2, doc.width * 0.2, doc.width * 0.18])
    lc_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef4f0")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6e6de")),
            ("PADDING", (0, 0), (-1, -1), 4.5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(lc_table)
    story.append(Spacer(1, 10))

    # 4. IPCC Tier 1 Carbon Pools Breakdown
    pools = end_carbon.get("pools", [])
    if pools:
        cp_title = "আইপিসিসি ব্লু কার্বন মজুত বিভাজন" if is_bn else "IPCC Tier-1 Biomass Carbon Pools"
        story.append(Paragraph(cp_title, heading_style))

        if isinstance(pools, list):
            carbon_data = [
                [
                    Paragraph("<b>Carbon Biomass Pool</b>", body_style),
                    Paragraph("<b>Density</b>", body_style),
                    Paragraph("<b>Stock</b>", body_style),
                    Paragraph("<b>Share</b>", body_style),
                ]
            ]
            for p in pools:
                p_name = p.get("name", "Biomass Pool")
                p_dens = f"{float(p.get('densityMgCPerHa', 0)):.1f} Mg C/ha"
                p_stock = f"{float(p.get('carbonMgC', 0)):,.0f} Mg C"
                p_share = f"{float(p.get('sharePct', 0)):.1f}%"
                carbon_data.append([
                    Paragraph(p_name, body_style),
                    Paragraph(p_dens, body_style),
                    Paragraph(p_stock, body_style),
                    Paragraph(p_share, body_style),
                ])
            cp_table = Table(carbon_data, colWidths=[doc.width * 0.4, doc.width * 0.25, doc.width * 0.2, doc.width * 0.15])
        else:
            agb = float(pools.get("aboveGroundMgC", 0))
            bgb = float(pools.get("belowGroundMgC", 0))
            soc = float(pools.get("soilOrganicCarbonMgC", 0))
            deadwood = float(pools.get("deadwoodMgC", 0))

            carbon_data = [
                [
                    Paragraph("<b>Above-Ground Biomass (AGB)</b>", body_style),
                    Paragraph(f"{agb:,.0f} Mg C", body_style),
                    Paragraph("<b>Soil Organic Carbon (SOC 1m)</b>", body_style),
                    Paragraph(f"{soc:,.0f} Mg C", body_style),
                ],
                [
                    Paragraph("<b>Below-Ground Biomass (BGB)</b>", body_style),
                    Paragraph(f"{bgb:,.0f} Mg C", body_style),
                    Paragraph("<b>Deadwood & Litter Pool</b>", body_style),
                    Paragraph(f"{deadwood:,.0f} Mg C", body_style),
                ],
            ]
            cp_table = Table(carbon_data, colWidths=[doc.width * 0.3, doc.width * 0.2, doc.width * 0.3, doc.width * 0.2])

        cp_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafdfa")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6e6de")),
                ("PADDING", (0, 0), (-1, -1), 4.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ])
        )
        story.append(cp_table)
        story.append(Spacer(1, 10))

    # 5. Ecosystem Narrative
    narr_paras = narrative.get("bn" if is_bn else "en", [])
    if narr_paras:
        story.append(Paragraph("পরিবেশগত বিবরণী ও মূল্যায়ন" if is_bn else "Ecosystem Narrative & Assessment", heading_style))
        for p in narr_paras[:3]:
            story.append(Paragraph(p, body_style))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 6))

    # 6. Scientific Verification & Sign-off
    story.append(Spacer(1, 8))
    accuracy_note = ""
    if accuracy:
        oa = float(accuracy.get("overallAccuracy", 0)) * 100
        kappa = float(accuracy.get("kappa", 0))
        accuracy_note = f"Overall Accuracy: {oa:.1f}% | Kappa Index: {kappa:.3f} | "

    disc_text = (
        f"<font size='7' color='#6c817a'>"
        f"{accuracy_note}Derived from Copernicus Sentinel-2 MSI surface reflectance. "
        f"Indicative scientific estimate for research & monitoring; not 100% ground-truth and not certified carbon credit issuance. Sundarban Blue Carbon Observatory."
        f"</font>"
    )
    story.append(Paragraph(disc_text, ParagraphStyle("ReportDisc", parent=meta_style, alignment=1)))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

