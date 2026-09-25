"""Methodology metadata and auditing documentation for Blue Carbon estimation (Phase 6)."""
from typing import Any, Dict, List
from .factors import CARBON_FACTORS, get_all_factors

METHODOLOGY_TIER: str = "Tier 1 / indicative"
METHODOLOGY_NAME: str = "IPCC 2013 Coastal Wetlands / Blue Carbon Initiative Model"
METHODOLOGY_VERSION: str = "v1.5-2025"

ASSUMPTIONS: List[str] = [
    "Sentinel-2 multi-spectral observations classify surface canopy area; satellite sensors do not directly measure subsurface carbon flux.",
    "Carbon density factors for Aboveground Biomass (AGB), Belowground Biomass (BGB), and Soil Organic Carbon (SOC 0-1m) follow IPCC 2013 Wetlands Supplement defaults.",
    "Molecular mass conversion from elemental Carbon to CO2-equivalent utilizes the standard stoichiometry ratio 44/12 (≈ 3.6667).",
    "Carbon associated with mapped mangrove loss represents affected in-situ stock and does not assume instantaneous 100% atmospheric volatilization.",
    "First-order Gaussian error propagation assumes zero covariance between optical classification boundaries and allometric biomass factor distributions.",
]

LIMITATIONS: List[str] = [
    "Soil organic carbon exhibits extreme spatial heterogeneity across intertidal mudflats and mangrove channels; site-specific sediment core calibrations are required for Tier-3 certification.",
    "Diurnal tidal inundation cycles can introduce spectral variation in optical indices (NDVI/NDWI) along low-elevation pioneer mangrove margins.",
    "Calculated tonnages are indicative models for conservation planning and do not constitute certified carbon credit issuance under Verra (VM0033/VM0007) or Plan Vivo standards.",
]


def get_methodology_report() -> Dict[str, Any]:
    """Retrieve structured methodology documentation for auditing and transparency."""
    return {
        "methodologyName": METHODOLOGY_NAME,
        "methodologyVersion": METHODOLOGY_VERSION,
        "methodologyTier": METHODOLOGY_TIER,
        "description": (
            "Model-based indicative blue-carbon accounting pipeline combining Sentinel-2 classified "
            "surface area activity data with IPCC 2013 Coastal Wetlands Supplement stock density factors."
        ),
        "primaryReferences": [
            {
                "title": "2013 Supplement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories: Wetlands (Chapter 4: Coastal Wetlands)",
                "authors": "IPCC Task Force on National Greenhouse Gas Inventories",
                "year": 2013,
                "url": "https://www.ipcc-nggip.iges.or.jp/public/wetlands/",
            },
            {
                "title": "Coastal Blue Carbon: Methods for assessing carbon stocks and emissions factors in mangroves, tidal salt marshes, and seagrasses",
                "authors": "Howard, J., Hoyt, S., Isensee, K., Telszewski, M., Pidgeon, E. (eds.)",
                "year": 2014,
                "organization": "Conservation International, IOC-UNESCO, IUCN",
                "url": "https://www.thebluecarboninitiative.org/manual",
            },
            {
                "title": "Carbon sequestration and annual carbon flux in the mangrove ecosystem of Indian Sundarbans",
                "authors": "Ray, R., Ganguly, D., Chowdhury, C., Dey, M., Das, S., Dutta, M. K., & De, T. K.",
                "year": 2011,
                "journal": "Wetlands Ecology and Management, 19(2), 113-124",
                "url": "https://doi.org/10.1007/s11273-010-9207-z",
            },
        ],
        "carbonPools": [
            {"poolId": "aboveground_biomass", "poolName": "Aboveground Biomass (AGB)", "tier": "Tier 1"},
            {"poolId": "belowground_biomass", "poolName": "Belowground Biomass (BGB)", "tier": "Tier 1"},
            {"poolId": "soil_organic_carbon", "poolName": "Soil Organic Carbon (SOC 0–1m)", "tier": "Tier 1"},
            {"poolId": "dead_wood_litter", "poolName": "Dead Wood & Litter (Optional)", "tier": "Tier 1"},
        ],
        "registeredFactors": get_all_factors(),
        "molecularConversionFactor": "44/12 (CO2 / C = 3.6667)",
        "assumptions": ASSUMPTIONS,
        "limitations": LIMITATIONS,
        "carbonCreditDisclaimer": (
            "This system produces analytical, model-based indicative carbon stock estimates for regional "
            "environmental intelligence. It does NOT constitute a carbon-credit issuance, registry listing, "
            "additionality verification, permanence guarantee, or financial market entitlement."
        ),
    }
