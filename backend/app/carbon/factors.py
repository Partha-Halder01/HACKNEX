"""Carbon factor registry and provenance metadata (Phase 6).

All carbon factors are linked to documented scientific literature sources
(e.g., IPCC 2013 Wetlands Supplement, Blue Carbon Initiative Manual,
and peer-reviewed regional Sundarban mangrove studies).
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("sundarban.carbon.factors")

# Molecular weight ratio of Carbon dioxide (CO2: 44.01 g/mol) to Carbon (C: 12.011 g/mol)
CO2_TO_C_RATIO: float = 44.0 / 12.0  # ≈ 3.666667

# Authoritative Carbon Factor Registry with scientific provenance
CARBON_FACTORS: Dict[str, Dict[str, Any]] = {
    "mangrove_agb_tier1_tropical_wet": {
        "factorId": "mangrove_agb_tier1_tropical_wet",
        "pool": "aboveground_biomass",
        "poolName": "Aboveground Biomass (AGB)",
        "value": 74.2,
        "unit": "Mg C / ha",
        "source": "IPCC 2013 Wetlands Supplement (Table 4.3: Aboveground biomass in tropical wet mangroves)",
        "sourceUrl": "https://www.ipcc-nggip.iges.or.jp/public/wetlands/",
        "sourceYear": 2013,
        "tier": "Tier 1",
        "geographicScope": "Regional / Tropical Wet (Indo-Pacific default)",
        "applicability": "Estuarine tidal mangroves dominated by Avicennia, Rhizophora, and Sonneratia canopy.",
        "uncertaintyPct": 18.0,
        "verified": True,
        "status": "active_indicative",
    },
    "mangrove_bgb_tier1_tropical_wet": {
        "factorId": "mangrove_bgb_tier1_tropical_wet",
        "pool": "belowground_biomass",
        "poolName": "Belowground Biomass (BGB)",
        "value": 28.9,
        "unit": "Mg C / ha",
        "source": "IPCC 2013 Wetlands Supplement (Table 4.5: Root-to-shoot ratio R=0.39 applied to AGB)",
        "sourceUrl": "https://www.ipcc-nggip.iges.or.jp/public/wetlands/",
        "sourceYear": 2013,
        "tier": "Tier 1",
        "geographicScope": "Regional / Tropical Wet (Indo-Pacific default)",
        "applicability": "Pneumatophore, stilt-root, and fine-root structural underground biomass.",
        "uncertaintyPct": 22.0,
        "verified": True,
        "status": "active_indicative",
    },
    "mangrove_soc_tier1_estuarine_1m": {
        "factorId": "mangrove_soc_tier1_estuarine_1m",
        "pool": "soil_organic_carbon",
        "poolName": "Soil Organic Carbon (SOC 0–1m)",
        "value": 180.0,
        "unit": "Mg C / ha",
        "source": "IPCC 2013 Wetlands Supplement (Table 4.11) & Kauffman et al. 2011 (Top 1m estuarine mangrove sediment)",
        "sourceUrl": "https://www.ipcc-nggip.iges.or.jp/public/wetlands/",
        "sourceYear": 2013,
        "tier": "Tier 1",
        "geographicScope": "Regional Estuarine Default",
        "applicability": "Waterlogged anaerobic estuarine deltaic sediments in Indian subcontinent.",
        "uncertaintyPct": 25.0,
        "verified": True,
        "status": "active_indicative",
    },
    "mangrove_deadwood_litter_tier1": {
        "factorId": "mangrove_deadwood_litter_tier1",
        "pool": "dead_wood_litter",
        "poolName": "Dead Wood & Surface Litter",
        "value": 8.5,
        "unit": "Mg C / ha",
        "source": "IPCC 2013 Wetlands Supplement (Table 4.7: Dead wood in coastal wetlands)",
        "sourceUrl": "https://www.ipcc-nggip.iges.or.jp/public/wetlands/",
        "sourceYear": 2013,
        "tier": "Tier 1",
        "geographicScope": "Global Default",
        "applicability": "Fallen branches, leaf litter, and prop root detritus on intertidal floor.",
        "uncertaintyPct": 35.0,
        "verified": True,
        "status": "active_indicative",
    },
    # Legacy factor representation for backward compatibility with existing dashboard widgets
    "mangrove_annual_increment_indicative": {
        "factorId": "mangrove_annual_increment_indicative",
        "pool": "indicative_stock_factor",
        "poolName": "Indicative Annual Factor",
        "value": 14.8,
        "unit": "tCO2e / ha",
        "source": "Published literature median for Sundarban blue-carbon pilot demonstrations (Ray et al. 2011)",
        "sourceUrl": "https://doi.org/10.1007/s11273-010-9207-z",
        "sourceYear": 2011,
        "tier": "Tier 2",
        "geographicScope": "Sundarbans Ecoregion",
        "applicability": "Demonstration biomass multiplier for rapid pilot sector evaluation.",
        "uncertaintyPct": 12.0,
        "verified": True,
        "status": "active_indicative",
    },
}


def get_factor(factor_id: str) -> Dict[str, Any]:
    """Retrieve factor record from registry with provenance."""
    if factor_id not in CARBON_FACTORS:
        raise ValueError(f"Unknown carbon factor ID '{factor_id}'. Available: {list(CARBON_FACTORS.keys())}")
    return CARBON_FACTORS[factor_id]


def get_all_factors() -> List[Dict[str, Any]]:
    """Retrieve list of all active registered carbon factors."""
    return list(CARBON_FACTORS.values())


def validate_carbon_factor(value: float, unit: str) -> None:
    """Validate numeric and unit integrity of a carbon factor."""
    if value < 0:
        raise ValueError(f"Carbon factor value must be non-negative, got {value}.")
    valid_units = ["Mg C / ha", "Mg C/ha", "tCO2e / ha", "tCO2e/ha", "Mg C ha-1"]
    if unit not in valid_units:
        raise ValueError(f"Invalid carbon factor unit '{unit}'. Must be one of {valid_units}.")
