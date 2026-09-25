"""Non-prescriptive management considerations and deterministic field verification prioritization (Phase 7).

CRITICAL SCIENTIFIC SAFETY:
- Management considerations are non-prescriptive, evidence-grounded considerations.
- Field verification priority is a survey planning flag, NOT proof of causal damage.
"""
from typing import List, Tuple
from ..schemas.intelligence import (
    FieldVerificationPriority,
    ManagementConsideration,
    EvidenceItem,
)


def evaluate_field_verification_priority(
    loss_ha: float,
    gain_ha: float,
    classification_conf: float,
    change_conf: float,
    is_real_data: bool,
    village_tag: str,
) -> FieldVerificationPriority:
    """Deterministically determine field ground-truthing and survey priority."""
    reason_codes: List[str] = []
    rec_en: List[str] = []
    rec_bn: List[str] = []

    if not is_real_data:
        reason_codes.append("DEMO_DATA_FALLBACK")
        rec_en.append("Calibrate classification with live Earth Engine ingestion and local ground control points.")
        rec_bn.append("লাইভ আর্থ ইঞ্জিন উপগ্রহ তথ্য ও স্থানীয় গ্রাউন্ড কন্ট্রোল পয়েন্ট দিয়ে মডেলটি ক্যালিব্রেট করুন।")

    if loss_ha >= 5.0:
        reason_codes.append("SIGNIFICANT_MANGROVE_LOSS_DETECTED")
        rec_en.append("Prioritize UAV drone survey or boat patrol along shoreline segments showing Mangrove → Water transitions.")
        rec_bn.append("যেসব উপকূলীয় এলাকায় ম্যাংগ্রোভ থেকে জলভাগে রূপান্তর দেখা গেছে সেখানে ড্রোন বা বোট টহল পরিচালনা করুন।")
    elif loss_ha > 0.5:
        reason_codes.append("LOCALIZED_CANOPY_REDUCTION")
        rec_en.append("Conduct spot verification of peripheral forest boundaries showing spectral canopy retreat.")
        rec_bn.append("সীমান্তবর্তী বনে যেখানে ক্যানোপি হ্রাস পেয়েছে সেখানে স্থানীয় স্পট যাচাই করুন।")

    if gain_ha >= 10.0:
        reason_codes.append("SIGNIFICANT_CANOPY_EXPANSION")
        rec_en.append("Inspect pioneer mudflat recruitments to assess seedling survival and natural regeneration rate.")
        rec_bn.append("নতুন চরে প্রাকৃতিকভাবে জন্মানো চারার স্থায়িত্ব ও বৃদ্ধির হার পর্যবেক্ষণ করুন।")

    if classification_conf < 0.85:
        reason_codes.append("MODERATE_CLASSIFICATION_UNCERTAINTY")
        rec_en.append("Collect ground-truth spectral training samples across mixed aquaculture and wetland margins.")
        rec_bn.append("চিংড়ি ভেড়ি ও জলাভূমির সীমানা থেকে অতিরিক্ত গ্রাউন্ড ট্রুথ নমুনা সংগ্রহ করুন।")

    if not reason_codes:
        reason_codes.append("ROUTINE_MONITORING")
        rec_en.append("Maintain periodic quarterly satellite canopy monitoring.")
        rec_bn.append("ত্রৈমাসিক নিয়মিত উপগ্রহ নজরদারি বজায় রাখুন।")

    # Priority determination
    if "SIGNIFICANT_MANGROVE_LOSS_DETECTED" in reason_codes or classification_conf < 0.70:
        priority = "high"
        priority_bn = "উচ্চ (High)"
    elif "LOCALIZED_CANOPY_REDUCTION" in reason_codes or "SIGNIFICANT_CANOPY_EXPANSION" in reason_codes or not is_real_data:
        priority = "medium"
        priority_bn = "মাঝারি (Medium)"
    else:
        priority = "routine"
        priority_bn = "নিয়মিত পর্যবেক্ষণ (Routine)"

    disclaimer = (
        "Field verification priority is an analytical survey planning indicator based on detected spectral changes. "
        "It does NOT constitute proof of illegal activities, embankment breach, or certified ecosystem damage."
    )

    return FieldVerificationPriority(
        priority=priority,
        priority_bn=priority_bn,
        reason_codes=reason_codes,
        recommended_verification=rec_en,
        recommended_verification_bn=rec_bn,
        disclaimer=disclaimer,
    )


def generate_management_considerations(
    village_name: str,
    bengali_village_name: str,
    loss_ha: float,
    gain_ha: float,
    mangrove_area_ha: float,
    carbon_stock_mg_c: float,
    evidence_items: List[EvidenceItem],
    village_tag: str,
) -> List[ManagementConsideration]:
    """Generate evidence-grounded, non-prescriptive stakeholder considerations."""
    evidence_ids = [e.evidence_id for e in evidence_items]

    # Find relevant evidence ID references
    lc_ev = next((eid for eid in evidence_ids if "LC-" in eid and "-001" in eid), f"LC-2025-{village_tag}-001")
    loss_ev = next((eid for eid in evidence_ids if "CD-" in eid and "-001" in eid), f"CD-2020-2025-{village_tag}-001")
    gain_ev = next((eid for eid in evidence_ids if "CD-" in eid and "-002" in eid), f"CD-2020-2025-{village_tag}-002")
    carb_ev = next((eid for eid in evidence_ids if "CARB-" in eid and "-001" in eid), f"CARB-2025-{village_tag}-001")

    considerations: List[ManagementConsideration] = []

    # Consideration 1: Shoreline Embankment & Fringe Monitoring
    if loss_ha > 0.0:
        considerations.append(
            ManagementConsideration(
                id=f"MC-{village_tag}-001",
                title="Shoreline Fringe & Embankment Verification",
                title_bn="উপকূলীয় প্যারাবন ও বাঁধ পর্যবেক্ষণ",
                description=(
                    f"Areas exhibiting spectral mangrove-to-water transition ({loss_ha:.1f} ha) may warrant "
                    "ground inspection by local forest department and panchayat personnel to differentiate between "
                    "cyclonic wave erosion, seasonal tidal inundation, and normal channel migration."
                ),
                description_bn=(
                    f"যেসব স্থানে ম্যাংগ্রোভ থেকে জলভাগে রূপান্তর ({loss_ha:.1f} হেক্টর) দেখা গেছে, সেখানে নদীভাঙন, "
                    "ঋতুভিত্তিক জোয়ারের প্রভাব নাকি জলপথের স্বাভাবিক পরিবর্তন তা নিশ্চিত করতে বন দপ্তর ও পঞ্চায়েতের মাঠ পর্যায়ে যৌথ পরিদর্শন সহায়ক হতে পারে।"
                ),
                priority="high" if loss_ha > 5.0 else "medium",
                stakeholder="forest_dept",
                evidence_references=[loss_ev, lc_ev],
            )
        )

    # Consideration 2: Community Nursery & Pioneer Mudflat Protection
    if gain_ha > 0.0:
        considerations.append(
            ManagementConsideration(
                id=f"MC-{village_tag}-002",
                title="Pioneer Mudflat Regeneration Support",
                title_bn="নতুন চরে প্রাকৃতিক পুনর্জন্ম সংরক্ষণ",
                description=(
                    f"Detected canopy expansions (+{gain_ha:.1f} ha) across active accreted mudflats could be considered "
                    "for community-led seedling protection initiatives to minimize livestock browsing and promote mangrove root stabilization."
                ),
                description_bn=(
                    f"নতুন জেগে ওঠা চরে যে ক্যানোপি বৃদ্ধি (+{gain_ha:.1f} হেক্টর) লক্ষ্য করা গেছে, সেখানে চারার সুরক্ষা নিশ্চিত করতে "
                    "স্থানীয় গ্রামবাসী ও পঞ্চায়েতের সহায়তায় পশু অবাধ বিচরণ নিয়ন্ত্রণ ও কমিউনিটি নার্সারি রক্ষণাবেক্ষণ বিবেচনা করা যেতে পারে।"
                ),
                priority="medium",
                stakeholder="community",
                evidence_references=[gain_ev, lc_ev],
            )
        )

    # Consideration 3: Blue Carbon Core Sediment Sampling
    considerations.append(
        ManagementConsideration(
            id=f"MC-{village_tag}-003",
            title="Sediment Core Sampling for Tier-3 Carbon Calibration",
            title_bn="উচ্চতর কার্বন মূল্যায়নের জন্য পলি পরীক্ষা",
            description=(
                f"The estimated {carbon_stock_mg_c:,.0f} Mg C carbon stock relies on IPCC Tier-1 literature factors. "
                "Researchers and conservation planners may consider localized sediment core sampling (0–1m) to advance from indicative estimation to Tier-3 site calibration."
            ),
            description_bn=(
                f"আনুমানিক {carbon_stock_mg_c:,.0f} Mg C কার্বন মজুত IPCC টিয়ার-১ সাহিত্যের উপর ভিত্তি করে নির্ণীত। "
                "উচ্চতর নির্ভুলতার জন্য গবেষকগণ স্থানীয়ভাবে মাটির গভীর পলি নমুনা (০–১ মিটার) পরীক্ষা করার উদ্যোগ গ্রহণ করতে পারেন।"
            ),
            priority="low",
            stakeholder="researcher",
            evidence_references=[carb_ev],
        )
    )

    # Consideration 4: Panchayat Land Use Zonation
    considerations.append(
        ManagementConsideration(
            id=f"MC-{village_tag}-004",
            title="Panchayat Wetland Buffer Awareness",
            title_bn="পঞ্চায়েত স্তরে জলাভূমি বাফার সচেতনতা",
            description=(
                f"Gram Panchayats across {village_name} could be supported with updated satellite land-cover maps to identify "
                "ecologically sensitive mangrove corridors and avoid unintended encroachment into tidal mudflats."
            ),
            description_bn=(
                f"{bengali_village_name} গ্রাম পঞ্চায়েতে উপগ্রহ মানচিত্র ব্যবহার করে সংবেদনশীল প্যারাবন এলাকা চিহ্নিত করা "
                "এবং প্রাকৃতিক জলপথ ও চরে অননুমোদিত খনন রোধে সচেতনতা বৃদ্ধি করা যেতে পারে।"
            ),
            priority="medium",
            stakeholder="panchayat",
            evidence_references=[lc_ev],
        )
    )

    return considerations
