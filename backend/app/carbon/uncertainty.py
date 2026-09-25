"""Uncertainty analysis and first-order error propagation for blue carbon estimation (Phase 6).

Implements rigorous first-order uncertainty propagation:
    (uC / C) = sqrt( (uA / A)^2 + (uF / F)^2 )
and maintains explicit separation between classification confidence and carbon factor variance.
"""
import logging
import math
from typing import Any, Dict, Optional

logger = logging.getLogger("sundarban.carbon.uncertainty")

# Default relative standard error assumptions (literature based)
DEFAULT_AREA_UNCERTAINTY_PCT: float = 3.5    # Pixel count & polygon border uncertainty (±3.5%)
DEFAULT_FACTOR_UNCERTAINTY_PCT: float = 18.0  # IPCC Tier-1 regional biomass factor uncertainty (±18.0%)


def calculate_propagated_uncertainty(
    carbon_stock_mg_c: float,
    area_uncertainty_pct: float = DEFAULT_AREA_UNCERTAINTY_PCT,
    factor_uncertainty_pct: float = DEFAULT_FACTOR_UNCERTAINTY_PCT,
    classification_confidence: Optional[float] = None,
) -> Dict[str, Any]:
    """Calculate combined relative uncertainty and confidence bounds for estimated carbon stock.

    Formula:
        Relative Error = sqrt( (u_Area / Area)^2 + (u_Factor / Factor)^2 )
        Margin of Error (Mg C) = CarbonStock × Relative Error
        Lower Bound = CarbonStock - Margin of Error
        Upper Bound = CarbonStock + Margin of Error

    Args:
        carbon_stock_mg_c: Estimated carbon stock in Mg C.
        area_uncertainty_pct: Estimated spatial area relative uncertainty (%).
        factor_uncertainty_pct: Carbon factor relative uncertainty (%).
        classification_confidence: Optical classification confidence proxy (0.0 to 1.0).

    Returns:
        Structured uncertainty dictionary with quantitative bounds and qualitative notes.
    """
    if carbon_stock_mg_c <= 0:
        return {
            "status": "qualitative",
            "combinedRelativeUncertaintyPct": 0.0,
            "marginOfErrorMgC": 0.0,
            "lowerBoundMgC": 0.0,
            "upperBoundMgC": 0.0,
            "carbonRange": [0.0, 0.0],
            "areaUncertaintyPct": area_uncertainty_pct,
            "factorUncertaintyPct": factor_uncertainty_pct,
            "classificationConfidence": classification_confidence,
            "confidenceLevel": 85.0,
            "description": "Zero carbon stock; uncertainty is not applicable.",
        }

    # First-order error propagation
    rel_area = area_uncertainty_pct / 100.0
    rel_factor = factor_uncertainty_pct / 100.0
    rel_combined = math.sqrt((rel_area ** 2) + (rel_factor ** 2))
    combined_pct = round(rel_combined * 100.0, 1)

    margin_mg_c = round(carbon_stock_mg_c * rel_combined, 2)
    lower_bound = max(0.0, round(carbon_stock_mg_c - margin_mg_c, 2))
    upper_bound = round(carbon_stock_mg_c + margin_mg_c, 2)

    return {
        "status": "partial",
        "combinedRelativeUncertaintyPct": combined_pct,
        "marginOfErrorMgC": margin_mg_c,
        "lowerBoundMgC": lower_bound,
        "upperBoundMgC": upper_bound,
        "carbonRange": [lower_bound, upper_bound],
        "areaUncertaintyPct": area_uncertainty_pct,
        "factorUncertaintyPct": factor_uncertainty_pct,
        "classificationConfidence": round(classification_confidence, 4) if classification_confidence is not None else None,
        "confidenceLevel": 85.0,
        "methodologyNote": (
            "First-order Gaussian error propagation assuming independence between optical classification area "
            "and allometric biomass factors. In-situ sediment core sampling is required for Tier-3 statistical confidence."
        ),
    }
