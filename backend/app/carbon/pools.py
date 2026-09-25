"""Carbon pools stratification and management (Phase 6).

Separates Aboveground Biomass (AGB), Belowground Biomass (BGB),
Soil Organic Carbon (SOC), and Dead Wood / Litter pools according
to the IPCC 2013 Coastal Wetlands framework.
"""
import logging
from typing import Any, Dict, List, Optional
from .factors import CARBON_FACTORS, CO2_TO_C_RATIO

logger = logging.getLogger("sundarban.carbon.pools")

POOL_AGB: str = "aboveground_biomass"
POOL_BGB: str = "belowground_biomass"
POOL_SOC: str = "soil_organic_carbon"
POOL_LITTER: str = "dead_wood_litter"

PRIMARY_POOLS: List[str] = [POOL_AGB, POOL_BGB, POOL_SOC]
ALL_POOLS: List[str] = [POOL_AGB, POOL_BGB, POOL_SOC, POOL_LITTER]


def get_default_pool_factors() -> Dict[str, Dict[str, Any]]:
    """Retrieve mapping of primary carbon pools to authoritative Tier-1 factors."""
    return {
        POOL_AGB: CARBON_FACTORS["mangrove_agb_tier1_tropical_wet"],
        POOL_BGB: CARBON_FACTORS["mangrove_bgb_tier1_tropical_wet"],
        POOL_SOC: CARBON_FACTORS["mangrove_soc_tier1_estuarine_1m"],
        POOL_LITTER: CARBON_FACTORS["mangrove_deadwood_litter_tier1"],
    }


def calculate_stratified_pools(
    mangrove_area_ha: float,
    include_litter: bool = False,
) -> Dict[str, Any]:
    """Calculate carbon stock across individual carbon pools in Mg C and Mg CO2e.

    Args:
        mangrove_area_ha: Monitored mangrove surface area in hectares.
        include_litter: Whether to include dead wood / litter pool (default False).

    Returns:
        Structured breakdown with per-pool stocks, percentages, and exclusion details.
    """
    if mangrove_area_ha < 0:
        raise ValueError(f"Mangrove area cannot be negative, got {mangrove_area_ha}.")

    factors = get_default_pool_factors()
    active_pools = PRIMARY_POOLS + ([POOL_LITTER] if include_litter else [])

    pools_data: Dict[str, Dict[str, Any]] = {}
    total_carbon_mg_c: float = 0.0

    for pool_key in active_pools:
        factor_info = factors[pool_key]
        val_per_ha = factor_info["value"]
        stock_mg_c = round(mangrove_area_ha * val_per_ha, 2)
        stock_co2e = round(stock_mg_c * CO2_TO_C_RATIO, 2)
        total_carbon_mg_c += stock_mg_c

        pools_data[pool_key] = {
            "pool_id": pool_key,
            "pool_name": factor_info["poolName"],
            "factor_value": val_per_ha,
            "factor_unit": factor_info["unit"],
            "carbon_mg_c": stock_mg_c,
            "co2e_equivalent_mg": stock_co2e,
            "factor_source": factor_info["source"],
            "tier": factor_info["tier"],
            "uncertainty_pct": factor_info.get("uncertaintyPct", 20.0),
        }

    # Compute percentages of total stock
    total_carbon_mg_c = round(total_carbon_mg_c, 2)
    for pool_key in active_pools:
        c_val = pools_data[pool_key]["carbon_mg_c"]
        pct = round((c_val / total_carbon_mg_c) * 100.0, 1) if total_carbon_mg_c > 0 else 0.0
        pools_data[pool_key]["percentage_of_total"] = pct

    excluded_pools: List[Dict[str, str]] = []
    if not include_litter:
        excluded_pools.append({
            "pool_id": POOL_LITTER,
            "pool_name": "Dead Wood & Surface Litter",
            "reason_for_exclusion": "Tier-1 literature factor exhibits high regional variance (±35%) and contributes <3% of total mangrove blue carbon; excluded from baseline to preserve conservative estimation.",
        })

    return {
        "mangroveAreaHa": mangrove_area_ha,
        "totalCarbonMgC": total_carbon_mg_c,
        "totalCo2eMg": round(total_carbon_mg_c * CO2_TO_C_RATIO, 2),
        "totalDensityMgCPerHa": round(total_carbon_mg_c / mangrove_area_ha, 2) if mangrove_area_ha > 0 else 0.0,
        "pools": pools_data,
        "includedPools": [p["pool_name"] for p in pools_data.values()],
        "excludedPools": excluded_pools,
    }
