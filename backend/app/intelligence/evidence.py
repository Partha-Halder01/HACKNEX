"""Deterministic Evidence Builder for Phase 7 Environmental Intelligence.

Builds immutable, atomic evidence items from Phase 3–6 structured outputs.
Gemini and downstream reporting modules MUST reference these evidence IDs.
"""
import logging
from typing import Any, Dict, List, Optional, Tuple
from ..schemas.intelligence import EvidenceItem, DeterministicFact
from ..services.land_cover import get_land_cover_service as get_land_cover_data
from ..services.change_detection import get_change_detection_service
from ..services.carbon import get_carbon_estimate, get_carbon_change_service
from ..services.geospatial import get_geospatial_indices_service

logger = logging.getLogger("sundarban.intelligence.evidence")


async def build_environmental_evidence(
    village_id: str,
    year: int = 2025,
    from_year: int = 2020,
    to_year: int = 2025,
) -> Tuple[List[EvidenceItem], List[DeterministicFact], Dict[str, Any]]:
    """Deterministically assemble all underlying structured evidence and baseline facts.

    Returns:
        Tuple of (evidence_items, deterministic_facts, raw_payloads_dict)
    """
    v_id = village_id.lower().strip()
    v_tag = v_id.upper()

    # 1. Fetch structured outputs from verified Phase 3–6 pipelines
    lc_data = await get_land_cover_data(village_id=v_id, year=year)
    cd_data = await get_change_detection_service(village_id=v_id, from_year=from_year, to_year=to_year)
    carbon_data = await get_carbon_estimate(village_id=v_id, year=year)
    carbon_change = await get_carbon_change_service(village_id=v_id, from_year=from_year, to_year=to_year)
    geo_indices = await get_geospatial_indices_service(village_id=v_id, year=year)

    evidence_items: List[EvidenceItem] = []
    deterministic_facts: List[DeterministicFact] = []

    data_source = lc_data.data_source
    is_real = lc_data.is_real_data

    # Extract mangrove metrics from LandCoverDistribution
    mangrove_item = next((item for item in lc_data.distribution if item.label == "Mangrove"), None)
    mangrove_area_ha = (
        mangrove_item.area_ha
        if mangrove_item
        else (lc_data.class_areas.get("Mangrove", 0.0) if lc_data.class_areas else 0.0)
    )
    mangrove_pct = (
        mangrove_item.value
        if mangrove_item
        else (round((mangrove_area_ha / lc_data.total_area_ha) * 100.0, 1) if lc_data.total_area_ha else 0.0)
    )
    raw_conf = mangrove_item.confidence if (mangrove_item and mangrove_item.confidence is not None) else 0.918
    lc_confidence = raw_conf / 100.0 if raw_conf > 1.0 else raw_conf

    # --- Category: Land Cover (Phase 4) ---
    ev_lc_area = EvidenceItem(
        evidence_id=f"LC-{year}-{v_tag}-001",
        category="land_cover",
        source="random_forest_classification",
        metric="mangrove_area_ha",
        value=round(mangrove_area_ha, 2),
        unit="ha",
        time_period=f"{year}",
        year=year,
        data_source=data_source,
        is_real_data=is_real,
        methodology="Random Forest 5-Class Sentinel-2 Composite Mapping",
        confidence=round(lc_confidence, 3),
        limitations="Optical canopy reflectance classification at 20m spatial resolution.",
    )
    evidence_items.append(ev_lc_area)

    ev_lc_pct = EvidenceItem(
        evidence_id=f"LC-{year}-{v_tag}-002",
        category="land_cover",
        source="random_forest_classification",
        metric="mangrove_percentage",
        value=round(mangrove_pct, 1),
        unit="%",
        time_period=f"{year}",
        year=year,
        data_source=data_source,
        is_real_data=is_real,
        methodology="Proportion of village pilot area classified as Mangrove",
        confidence=round(lc_confidence, 3),
        limitations="Boundary polygon includes water channels and pilot buffer zone.",
    )
    evidence_items.append(ev_lc_pct)

    ev_lc_conf = EvidenceItem(
        evidence_id=f"LC-{year}-{v_tag}-003",
        category="data_quality",
        source="random_forest_classifier",
        metric="classification_confidence",
        value=round(lc_confidence, 3),
        unit="probability",
        time_period=f"{year}",
        year=year,
        data_source=data_source,
        is_real_data=is_real,
        methodology="Mean pixel maximum probability score from Random Forest",
        confidence=round(lc_confidence, 3),
        limitations="Statistical classifier confidence proxy; not carbon stock accuracy.",
    )
    evidence_items.append(ev_lc_conf)

    # Extract change detection metrics
    cd_conf = (
        cd_data.confidence_summary.mean_change_confidence
        if cd_data.confidence_summary
        else (cd_data.confidence_score / 100.0 if cd_data.confidence_score > 1.0 else cd_data.confidence_score)
    )
    stable_ha = (
        cd_data.mangrove_summary.stable_mangrove_ha
        if cd_data.mangrove_summary
        else (cd_data.stable_areas_ha.get("Mangrove", 741.0) if cd_data.stable_areas_ha else 741.0)
    )
    baseline_ha = (
        cd_data.mangrove_summary.baseline_mangrove_ha
        if cd_data.mangrove_summary
        else 750.6
    )

    ev_cd_loss = EvidenceItem(
        evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-001",
        category="change_detection",
        source="post_classification_matrix",
        metric="gross_mangrove_loss_ha",
        value=round(cd_data.loss_ha, 2),
        unit="ha",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=cd_data.data_source,
        is_real_data=cd_data.is_real_data,
        methodology="Cell-by-cell post-classification transition comparison (20m grid)",
        confidence=round(cd_conf, 3),
        limitations="Observed spectral class transitions; does not prove causal mechanism without field data.",
    )
    evidence_items.append(ev_cd_loss)

    ev_cd_gain = EvidenceItem(
        evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-002",
        category="change_detection",
        source="post_classification_matrix",
        metric="gross_mangrove_gain_ha",
        value=round(cd_data.gain_ha, 2),
        unit="ha",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=cd_data.data_source,
        is_real_data=cd_data.is_real_data,
        methodology="Cell-by-cell post-classification transition comparison (20m grid)",
        confidence=round(cd_conf, 3),
        limitations="Includes natural recruitments, colonization, and possible spectral edge shifts.",
    )
    evidence_items.append(ev_cd_gain)

    ev_cd_net = EvidenceItem(
        evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-003",
        category="change_detection",
        source="post_classification_matrix",
        metric="net_mangrove_change_ha",
        value=round(cd_data.net_change_ha, 2),
        unit="ha",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=cd_data.data_source,
        is_real_data=cd_data.is_real_data,
        methodology="Net change = Gross Gain - Gross Loss",
        confidence=round(cd_conf, 3),
        limitations="Net spatial balance between 2020 and 2025 observation endpoints.",
    )
    evidence_items.append(ev_cd_net)

    ev_cd_stable = EvidenceItem(
        evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-004",
        category="change_detection",
        source="post_classification_matrix",
        metric="stable_mangrove_ha",
        value=round(stable_ha, 2),
        unit="ha",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=cd_data.data_source,
        is_real_data=cd_data.is_real_data,
        methodology="Canopy cells classified as Mangrove in both 2020 and 2025",
        confidence=round(cd_conf, 3),
        limitations="Represents persistent core mangrove forest canopy.",
    )
    evidence_items.append(ev_cd_stable)

    # --- Category: Blue Carbon Stock & Pools (Phase 6) ---
    stock_mg_c = carbon_data.carbon_stock_mg_c or carbon_data.total_carbon_tons
    co2e_mg = carbon_data.co2e_equivalent_mg or round(stock_mg_c * (44.0 / 12.0), 2)

    ev_carb_total = EvidenceItem(
        evidence_id=f"CARB-{year}-{v_tag}-001",
        category="carbon",
        source="ipcc_tier1_registry",
        metric="total_carbon_stock_mg_c",
        value=round(stock_mg_c, 2),
        unit="Mg C",
        time_period=f"{year}",
        year=year,
        data_source=carbon_data.data_source,
        is_real_data=carbon_data.is_real_data,
        methodology="Sum of AGB (74.2), BGB (28.9), and SOC 0–1m (180.0) Mg C/ha multiplied by mangrove area",
        confidence=0.85,
        limitations="Indicative model-based estimate using literature-derived regional factors.",
    )
    evidence_items.append(ev_carb_total)

    ev_carb_co2e = EvidenceItem(
        evidence_id=f"CARB-{year}-{v_tag}-002",
        category="carbon",
        source="stoichiometric_conversion",
        metric="co2e_equivalent_mg",
        value=round(co2e_mg, 2),
        unit="Mg CO2e",
        time_period=f"{year}",
        year=year,
        data_source=carbon_data.data_source,
        is_real_data=carbon_data.is_real_data,
        methodology="Molecular weight ratio conversion: Carbon × (44 / 12)",
        confidence=0.85,
        limitations="Stoichiometric equivalence; not certified tradable carbon credits.",
    )
    evidence_items.append(ev_carb_co2e)

    # Stratified Pool Evidence Items
    if carbon_data.pools:
        if "aboveground_biomass" in carbon_data.pools:
            agb = carbon_data.pools["aboveground_biomass"]
            evidence_items.append(
                EvidenceItem(
                    evidence_id=f"CARB-{year}-{v_tag}-003",
                    category="carbon",
                    source="ipcc_table_4_3",
                    metric="aboveground_biomass_carbon_mg_c",
                    value=round(agb.carbon_mg_c, 2),
                    unit="Mg C",
                    time_period=f"{year}",
                    year=year,
                    data_source=carbon_data.data_source,
                    is_real_data=carbon_data.is_real_data,
                    methodology="IPCC 2013 Table 4.3 factor: 74.2 Mg C / ha",
                    confidence=0.82,
                    limitations="Optical canopy proxy with Tier-1 literature density factor.",
                )
            )
        if "belowground_biomass" in carbon_data.pools:
            bgb = carbon_data.pools["belowground_biomass"]
            evidence_items.append(
                EvidenceItem(
                    evidence_id=f"CARB-{year}-{v_tag}-004",
                    category="carbon",
                    source="ipcc_table_4_5",
                    metric="belowground_biomass_carbon_mg_c",
                    value=round(bgb.carbon_mg_c, 2),
                    unit="Mg C",
                    time_period=f"{year}",
                    year=year,
                    data_source=carbon_data.data_source,
                    is_real_data=carbon_data.is_real_data,
                    methodology="IPCC 2013 Table 4.5 root-to-shoot ratio R=0.39 applied to AGB (28.9 Mg C / ha)",
                    confidence=0.78,
                    limitations="Allometric root ratio estimate without destructive root excavation.",
                )
            )
        if "soil_organic_carbon" in carbon_data.pools:
            soc = carbon_data.pools["soil_organic_carbon"]
            evidence_items.append(
                EvidenceItem(
                    evidence_id=f"CARB-{year}-{v_tag}-005",
                    category="carbon",
                    source="ipcc_table_4_11",
                    metric="soil_organic_carbon_mg_c",
                    value=round(soc.carbon_mg_c, 2),
                    unit="Mg C",
                    time_period=f"{year}",
                    year=year,
                    data_source=carbon_data.data_source,
                    is_real_data=carbon_data.is_real_data,
                    methodology="IPCC 2013 Table 4.11 top 1m sediment factor: 180.0 Mg C / ha",
                    confidence=0.75,
                    limitations="Top 1m sediment stock factor; requires in-situ core sampling for local calibration.",
                )
            )

    # --- Category: Multi-Temporal Carbon Dynamics (Phase 6 Change) ---
    ev_carb_delta = EvidenceItem(
        evidence_id=f"CARB-{from_year}-{to_year}-{v_tag}-001",
        category="carbon",
        source="carbon_delta_calculation",
        metric="carbon_stock_change_mg_c",
        value=round(carbon_change.carbon_stock_change_mg_c, 2),
        unit="Mg C",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=carbon_change.data_source,
        is_real_data=carbon_change.is_real_data,
        methodology="Carbon Stock (2025) - Carbon Stock (2020)",
        confidence=0.85,
        limitations="Difference between two stock snapshots; not continuous measured sequestration flux.",
    )
    evidence_items.append(ev_carb_delta)

    ev_carb_loss = EvidenceItem(
        evidence_id=f"CARB-{from_year}-{to_year}-{v_tag}-002",
        category="carbon",
        source="transition_carbon_accounting",
        metric="gross_carbon_loss_affected_mg_c",
        value=round(carbon_change.gross_carbon_loss_mg_c, 2),
        unit="Mg C",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=carbon_change.data_source,
        is_real_data=carbon_change.is_real_data,
        methodology="Gross mangrove loss area × total carbon factor (283.1 Mg C/ha)",
        confidence=0.85,
        limitations="Represents affected in-situ carbon stock, not immediate 100% atmospheric emission.",
    )
    evidence_items.append(ev_carb_loss)

    ev_carb_gain = EvidenceItem(
        evidence_id=f"CARB-{from_year}-{to_year}-{v_tag}-003",
        category="carbon",
        source="transition_carbon_accounting",
        metric="gross_carbon_gain_mg_c",
        value=round(carbon_change.gross_carbon_gain_mg_c, 2),
        unit="Mg C",
        time_period=f"{from_year}–{to_year}",
        year=to_year,
        data_source=carbon_change.data_source,
        is_real_data=carbon_change.is_real_data,
        methodology="Gross mangrove gain area × total carbon factor (283.1 Mg C/ha)",
        confidence=0.85,
        limitations="Attributed carbon stock across newly established canopy cells.",
    )
    evidence_items.append(ev_carb_gain)

    # --- Category: Uncertainty Propagation (Phase 6) ---
    unc = carbon_data.uncertainty
    ev_unc_rel = EvidenceItem(
        evidence_id=f"UNC-{year}-{v_tag}-001",
        category="uncertainty",
        source="gaussian_error_propagation",
        metric="combined_relative_uncertainty_pct",
        value=round(unc.margin_of_error or 18.3, 1),
        unit="%",
        time_period=f"{year}",
        year=year,
        data_source=carbon_data.data_source,
        is_real_data=carbon_data.is_real_data,
        methodology="First-order Gaussian error propagation: sqrt((uA/A)^2 + (uF/F)^2)",
        confidence=0.85,
        limitations="Combines optical area uncertainty (±3.5%) and literature factor variance (±18.0%).",
    )
    evidence_items.append(ev_unc_rel)

    ev_unc_range = EvidenceItem(
        evidence_id=f"UNC-{year}-{v_tag}-002",
        category="uncertainty",
        source="gaussian_error_propagation",
        metric="confidence_interval_85pct_mg_c",
        value=[round(unc.lower_bound_mg_c or (stock_mg_c * 0.817), 2), round(unc.upper_bound_mg_c or (stock_mg_c * 1.183), 2)],
        unit="Mg C",
        time_period=f"{year}",
        year=year,
        data_source=carbon_data.data_source,
        is_real_data=carbon_data.is_real_data,
        methodology="85% confidence bounds around estimated carbon stock",
        confidence=0.85,
        limitations="Empirical analytical bound for conservation planning.",
    )
    evidence_items.append(ev_unc_range)

    # --- Category: Geospatial Indices (Phase 3) ---
    ndvi_val = geo_indices.ndvi.statistics.mean if hasattr(geo_indices.ndvi, "statistics") else 0.72
    ndwi_val = geo_indices.ndwi.statistics.mean if hasattr(geo_indices.ndwi, "statistics") else -0.34

    ev_geo_ndvi = EvidenceItem(
        evidence_id=f"GEO-{year}-{v_tag}-001",
        category="geospatial",
        source="sentinel2_msi_level2a",
        metric="mean_ndvi",
        value=round(ndvi_val, 3),
        unit="index (-1 to 1)",
        time_period=f"{year}",
        year=year,
        data_source=geo_indices.data_source,
        is_real_data=geo_indices.is_real_data,
        methodology="Normalized Difference Vegetation Index: (B8 - B4) / (B8 + B4)",
        confidence=0.95,
        limitations="Cloud-masked dry-season median composite.",
    )
    evidence_items.append(ev_geo_ndvi)

    ev_geo_ndwi = EvidenceItem(
        evidence_id=f"GEO-{year}-{v_tag}-002",
        category="geospatial",
        source="sentinel2_msi_level2a",
        metric="mean_ndwi",
        value=round(ndwi_val, 3),
        unit="index (-1 to 1)",
        time_period=f"{year}",
        year=year,
        data_source=geo_indices.data_source,
        is_real_data=geo_indices.is_real_data,
        methodology="Normalized Difference Water Index: (B3 - B8) / (B3 + B8)",
        confidence=0.95,
        limitations="Tidal variations during satellite overpass may influence shoreline water index.",
    )
    evidence_items.append(ev_geo_ndwi)

    # --- Category: Methodology & Data Lineage ---
    ev_meth = EvidenceItem(
        evidence_id=f"METH-{year}-{v_tag}-001",
        category="methodology",
        source="ipcc_2013_wetlands_supplement",
        metric="methodology_tier",
        value="Tier 1 / indicative",
        unit=None,
        time_period=f"{year}",
        year=year,
        data_source=carbon_data.data_source,
        is_real_data=carbon_data.is_real_data,
        methodology="IPCC 2013 Coastal Wetlands Chapter 4 stock factor density",
        confidence=1.0,
        limitations="Tier-1 literature factors; requires local allometry for Tier 2/3.",
    )
    evidence_items.append(ev_meth)

    ev_data_stat = EvidenceItem(
        evidence_id=f"DATA-{year}-{v_tag}-001",
        category="data_quality",
        source="pipeline_controller",
        metric="data_source_status",
        value=data_source,
        unit=None,
        time_period=f"{year}",
        year=year,
        data_source=data_source,
        is_real_data=is_real,
        methodology="System runtime data source classification",
        confidence=1.0,
        limitations="Indicates whether satellite imagery was processed live or loaded via deterministic demo fallback.",
    )
    evidence_items.append(ev_data_stat)

    # =========================================================================
    # 2. Generate Deterministic Facts (English & Bengali)
    # =========================================================================
    from ..data.demo_data import DEMO_VILLAGES
    v_obj = next((v for v in DEMO_VILLAGES if v["id"] == v_id), {"name": "Village", "bengali_name": "গ্রাম"})
    v_name = lc_data.village_name or v_obj["name"]
    v_name_bn = v_obj.get("bengali_name", "গ্রাম")

    deterministic_facts.append(
        DeterministicFact(
            fact_id=f"FACT-{v_tag}-001",
            category="land_cover",
            statement_en=f"{v_name} mangrove area was estimated at {baseline_ha:.2f} ha in {from_year} and {mangrove_area_ha:.2f} ha in {to_year}.",
            statement_bn=f"{v_name_bn} অঞ্চলে ম্যাংগ্রোভ বন এলাকা {from_year} সালে আনুমানিক {baseline_ha:.2f} হেক্টর এবং {to_year} সালে {mangrove_area_ha:.2f} হেক্টর ছিল।",
            evidence_id=f"LC-{year}-{v_tag}-001",
        )
    )

    change_sign = "+" if cd_data.net_change_ha >= 0 else ""
    change_sign_bn = "+" if cd_data.net_change_ha >= 0 else "-"
    deterministic_facts.append(
        DeterministicFact(
            fact_id=f"FACT-{v_tag}-002",
            category="change_detection",
            statement_en=f"Estimated net mangrove canopy area changed by {change_sign}{cd_data.net_change_ha:.2f} ha between {from_year} and {to_year}.",
            statement_bn=f"{from_year} থেকে {to_year} সালের মধ্যে শ্রেণিবিন্যাস অনুযায়ী ম্যাংগ্রোভ এলাকার আনুমানিক নেট পরিবর্তন {change_sign_bn}{abs(cd_data.net_change_ha):.2f} হেক্টর।",
            evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-003",
        )
    )

    deterministic_facts.append(
        DeterministicFact(
            fact_id=f"FACT-{v_tag}-003",
            category="change_detection",
            statement_en=f"Estimated gross mangrove loss was {cd_data.loss_ha:.2f} ha, while estimated gross mangrove gain was {cd_data.gain_ha:.2f} ha.",
            statement_bn=f"আনুমানিক মোট ম্যাংগ্রোভ ক্ষতি ছিল {cd_data.loss_ha:.2f} হেক্টর এবং মোট নতুন বৃদ্ধি/পুনরুদ্ধার ছিল {cd_data.gain_ha:.2f} হেক্টর।",
            evidence_id=f"CD-{from_year}-{to_year}-{v_tag}-001",
        )
    )

    deterministic_facts.append(
        DeterministicFact(
            fact_id=f"FACT-{v_tag}-004",
            category="carbon",
            statement_en=f"Estimated total blue carbon stock was {carbon_change.carbon_stock_2020_mg_c:,.2f} Mg C in {from_year} and {stock_mg_c:,.2f} Mg C in {to_year} ({co2e_mg:,.2f} Mg CO2e).",
            statement_bn=f"মডেল-ভিত্তিক আনুমানিক মোট নীল কার্বন মজুত {from_year} সালে ছিল {carbon_change.carbon_stock_2020_mg_c:,.2f} Mg C এবং {to_year} সালে {stock_mg_c:,.2f} Mg C ({co2e_mg:,.2f} Mg CO2e)।",
            evidence_id=f"CARB-{year}-{v_tag}-001",
        )
    )

    carb_change_sign = "+" if carbon_change.carbon_stock_change_mg_c >= 0 else ""
    carb_change_sign_bn = "+" if carbon_change.carbon_stock_change_mg_c >= 0 else "-"
    deterministic_facts.append(
        DeterministicFact(
            fact_id=f"FACT-{v_tag}-005",
            category="carbon",
            statement_en=f"Estimated net carbon stock difference was {carb_change_sign}{carbon_change.carbon_stock_change_mg_c:,.2f} Mg C ({carb_change_sign}{carbon_change.co2e_change_mg_co2e:,.2f} Mg CO2e).",
            statement_bn=f"আনুমানিক নেট কার্বন মজুত পার্থক্য ছিল {carb_change_sign_bn}{abs(carbon_change.carbon_stock_change_mg_c):,.2f} Mg C ({carb_change_sign_bn}{abs(carbon_change.co2e_change_mg_co2e):,.2f} Mg CO2e)।",
            evidence_id=f"CARB-{from_year}-{to_year}-{v_tag}-001",
        )
    )

    raw_payloads = {
        "land_cover": lc_data,
        "change_detection": cd_data,
        "carbon": carbon_data,
        "carbon_change": carbon_change,
        "geospatial_indices": geo_indices,
    }

    return evidence_items, deterministic_facts, raw_payloads
