"""Carbon stock and change for an analysed AOI, with propagated ± uncertainty.

IPCC 2013 Wetlands Supplement Tier 1 densities (AGB + BGB + SOC 0–1 m) from
app.carbon.pools; no monetary value is ever attached.

Uncertainty model (first-order, independent terms, 1σ-style relative errors):
  stock:  u_C / C = sqrt(u_area² + u_factor²)
  change: ΔC = Δarea × D
          u_Δarea = sqrt(uncertain_ha² + (u_area × (gain + loss))²)
          u_ΔC    = sqrt((D × u_Δarea)² + (u_factor × ΔC)²)
The factor error is shared by both dates, so it scales the change rather than
being added twice.
"""
import math
from typing import Any, Dict, Optional

from ..carbon.factors import CO2_TO_C_RATIO
from ..carbon.pools import calculate_stratified_pools
from ..carbon.uncertainty import DEFAULT_AREA_UNCERTAINTY_PCT, DEFAULT_FACTOR_UNCERTAINTY_PCT

DENSITY_MG_C_PER_HA: float = calculate_stratified_pools(1.0)["totalCarbonMgC"]  # 283.1
FACTOR_UNCERTAINTY_PCT: float = DEFAULT_FACTOR_UNCERTAINTY_PCT


def area_uncertainty_pct(accuracy: Optional[Dict[str, Any]]) -> float:
    """Relative area error from the mangrove class F1 score, floored at the default."""
    if accuracy:
        for cls in accuracy.get("classMetrics", []):
            if cls.get("className") == "Mangrove" and cls.get("f1") is not None:
                return round(max(DEFAULT_AREA_UNCERTAINTY_PCT, (1.0 - float(cls["f1"])) * 100.0), 2)
    return DEFAULT_AREA_UNCERTAINTY_PCT


def _combined_pct(area_unc_pct: float) -> float:
    return math.sqrt(area_unc_pct ** 2 + FACTOR_UNCERTAINTY_PCT ** 2)


def carbon_stock(mangrove_ha: float, area_unc_pct: float) -> Dict[str, Any]:
    mangrove_ha = max(0.0, float(mangrove_ha))
    pools = calculate_stratified_pools(mangrove_ha)
    carbon = pools["totalCarbonMgC"]
    rel = _combined_pct(area_unc_pct) / 100.0
    margin = carbon * rel
    return {
        "mangroveHa": round(mangrove_ha, 2),
        "carbonMgC": round(carbon, 1),
        "co2eMg": round(carbon * CO2_TO_C_RATIO, 1),
        "uncertaintyPct": round(rel * 100.0, 1),
        "carbonRangeMgC": [round(max(0.0, carbon - margin), 1), round(carbon + margin, 1)],
        "co2eRangeMg": [
            round(max(0.0, carbon - margin) * CO2_TO_C_RATIO, 1),
            round((carbon + margin) * CO2_TO_C_RATIO, 1),
        ],
        "pools": [
            {
                "id": key,
                "name": p["pool_name"],
                "densityMgCPerHa": p["factor_value"],
                "carbonMgC": p["carbon_mg_c"],
                "sharePct": p.get("percentage_of_total", 0.0),
                "source": p["factor_source"],
            }
            for key, p in pools["pools"].items()
        ],
    }


def carbon_change(
    start_ha: float,
    end_ha: float,
    gain_ha: float,
    loss_ha: float,
    uncertain_ha: float,
    span_years: float,
    area_unc_pct: float,
) -> Dict[str, Any]:
    d = DENSITY_MG_C_PER_HA
    delta_area = end_ha - start_ha
    delta_c = delta_area * d
    u_area = area_unc_pct / 100.0
    u_delta_area = math.sqrt(uncertain_ha ** 2 + (u_area * (gain_ha + loss_ha)) ** 2)
    u_delta_c = math.sqrt((d * u_delta_area) ** 2 + ((FACTOR_UNCERTAINTY_PCT / 100.0) * delta_c) ** 2)
    years = max(span_years, 1e-6)
    return {
        "netAreaChangeHa": round(delta_area, 2),
        "carbonChangeMgC": round(delta_c, 1),
        "co2eChangeMg": round(delta_c * CO2_TO_C_RATIO, 1),
        "carbonChangeRangeMgC": [round(delta_c - u_delta_c, 1), round(delta_c + u_delta_c, 1)],
        "co2eChangeRangeMg": [
            round((delta_c - u_delta_c) * CO2_TO_C_RATIO, 1),
            round((delta_c + u_delta_c) * CO2_TO_C_RATIO, 1),
        ],
        "grossLossCarbonMgC": round(loss_ha * d, 1),
        "grossGainCarbonMgC": round(gain_ha * d, 1),
        "annualCo2eChangeMg": round(delta_c * CO2_TO_C_RATIO / years, 1),
        "note": (
            "Carbon associated with loss is the stock held in the lost area, not an "
            "immediate emission; gain is the Tier 1 stock a mature stand would hold."
        ),
    }


def methodology() -> Dict[str, Any]:
    return {
        "tier": "IPCC 2013 Wetlands Supplement, Tier 1 (indicative)",
        "densityMgCPerHa": round(DENSITY_MG_C_PER_HA, 1),
        "co2ToCRatio": round(CO2_TO_C_RATIO, 4),
        "factorUncertaintyPct": FACTOR_UNCERTAINTY_PCT,
        "defaultAreaUncertaintyPct": DEFAULT_AREA_UNCERTAINTY_PCT,
        "monetaryValue": None,
        "disclaimer": (
            "Model-based indicative estimates; not field-measured carbon and not certified carbon credits."
        ),
    }
