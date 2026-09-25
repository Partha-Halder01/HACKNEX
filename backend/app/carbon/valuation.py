"""Optional indicative economic valuation model for Blue Carbon (Phase 6).

NOTE: Economic calculations are purely illustrative indicative analytical models.
They DO NOT constitute carbon credit issuance, certified market validation,
or guaranteed financial revenues.
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("sundarban.carbon.valuation")

# Indicative voluntary carbon market reference price (USD / Mg CO2e)
DEFAULT_REFERENCE_PRICE_USD: float = 12.0
DEFAULT_PRICE_SOURCE: str = "Voluntary Carbon Market Blue Carbon Benchmark (Illustrative Pilot Model)"
DEFAULT_PRICE_DATE: str = "2025-01-01"


def calculate_indicative_valuation(
    co2e_metric_tons: float,
    reference_price_usd: Optional[float] = None,
    currency: str = "USD",
    price_source: Optional[str] = None,
    price_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Calculate indicative economic valuation based on a reference carbon price.

    Args:
        co2e_metric_tons: Estimated CO2 equivalent in metric tons (Mg CO2e).
        reference_price_usd: Unit reference carbon price (default $12.00 USD/tCO2e).
        currency: Pricing currency (default 'USD').
        price_source: Source citation for reference price benchmark.
        price_date: Reference date of carbon price citation.

    Returns:
        Structured indicative valuation object.
    """
    price = reference_price_usd if reference_price_usd is not None else DEFAULT_REFERENCE_PRICE_USD
    source = price_source if price_source is not None else DEFAULT_PRICE_SOURCE
    p_date = price_date if price_date is not None else DEFAULT_PRICE_DATE

    if co2e_metric_tons <= 0 or price <= 0:
        return {
            "status": "not_applicable" if co2e_metric_tons <= 0 else "not_configured",
            "co2e_metric_tons": co2e_metric_tons,
            "reference_price": price,
            "currency": currency,
            "price_source": source,
            "price_date": p_date,
            "indicative_value": 0.0,
            "disclaimer": (
                "Indicative valuation only. Does not represent certified carbon credit issuance, "
                "registry additionality verification, or guaranteed market revenue."
            ),
        }

    total_value = round(co2e_metric_tons * price, 2)

    return {
        "status": "indicative",
        "co2e_metric_tons": co2e_metric_tons,
        "reference_price": price,
        "currency": currency,
        "price_source": source,
        "price_date": p_date,
        "indicative_value": total_value,
        "disclaimer": (
            "Indicative analytical valuation for conservation planning only. Does not constitute certified carbon credit "
            "issuance under Verra VCS, Plan Vivo, or Gold Standard methodologies, and confers no legal entitlement to financial revenue."
        ),
    }
