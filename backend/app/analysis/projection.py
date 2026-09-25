"""3–5 year mangrove area and carbon scenarios with uncertainty bands.

These are illustrative "what if the recent pattern continues / changes" lines,
not forecasts. Every scenario starts from the last observed area.

- current_trend: least-squares slope through all observed points
- higher_loss:   trend minus one more observed gross-loss rate (loss doubles)
- recovery:      trend plus half the loss rate (loss halves) plus half the gain rate

The what-ifs are offsets from the trend, so they are always ordered
higher_loss <= current_trend <= recovery even when the fitted trend and the
mask-based gain/loss totals disagree (they are measured differently).

Band half-width (area) = sqrt((1.96·SE_slope·h)² + (0.25·|rate·h|)² + (u_area·A_end)²)
where the 25% term only applies to the two what-if scenarios (their rates are
assumptions, not fits). Carbon bands add the Tier 1 factor error on top.
"""
import math
from typing import Any, Dict, List, Sequence, Tuple

from .carbon import DENSITY_MG_C_PER_HA, FACTOR_UNCERTAINTY_PCT

DEFAULT_HORIZON_YEARS = 5
SCENARIO_ASSUMPTION_SPREAD = 0.25


def linear_trend(points: Sequence[Tuple[float, float]], area_unc_pct: float) -> Tuple[float, float]:
    """Return (slope ha/yr, standard error ha/yr) for (decimal_year, area) points.

    With only two points the residual error is undefined, so the slope error
    falls back to the area measurement error spread over the time span.
    """
    n = len(points)
    if n < 2:
        return 0.0, 0.0
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx <= 0:
        return 0.0, 0.0
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx

    span = max(xs) - min(xs)
    measurement_se = math.sqrt(2.0) * (area_unc_pct / 100.0) * my / span if span > 0 else 0.0
    if n >= 3:
        sse = sum((y - (my + slope * (x - mx))) ** 2 for x, y in zip(xs, ys))
        fit_se = math.sqrt(sse / (n - 2) / sxx)
        # Area errors are partly systematic, so the fit residuals alone understate
        # the error when points are few; keep whichever is larger.
        return slope, max(fit_se, measurement_se / math.sqrt(n - 1))
    return slope, measurement_se


def project_scenarios(
    points: Sequence[Tuple[float, float]],
    gain_ha: float,
    loss_ha: float,
    span_years: float,
    aoi_area_ha: float,
    area_unc_pct: float,
    horizon_years: int = DEFAULT_HORIZON_YEARS,
) -> Dict[str, Any]:
    if not points:
        raise ValueError("Need at least one observed point to project from.")
    points = sorted(points)
    end_t, end_area = points[-1]
    slope, slope_se = linear_trend(points, area_unc_pct)

    years = max(span_years, 1e-6)
    gain_rate, loss_rate = gain_ha / years, loss_ha / years
    scenario_defs: List[Dict[str, Any]] = [
        {
            "id": "current_trend",
            "name": "Current trend",
            "nameBn": "বর্তমান প্রবণতা",
            "description": "Straight-line continuation of the observed change.",
            "rate": slope,
            "assumed": False,
        },
        {
            "id": "higher_loss",
            "name": "Higher loss",
            "nameBn": "বেশি ক্ষতি",
            "description": "Loss doubles (e.g. stronger erosion or clearing) on top of the current trend.",
            "rate": slope - loss_rate,
            "assumed": True,
        },
        {
            "id": "recovery",
            "name": "Recovery",
            "nameBn": "পুনরুদ্ধার",
            "description": "Loss halves and gain rises by half (e.g. protection plus planting), relative to the current trend.",
            "rate": slope + 0.5 * loss_rate + 0.5 * gain_rate,
            "assumed": True,
        },
    ]

    u_area = area_unc_pct / 100.0
    u_factor = FACTOR_UNCERTAINTY_PCT / 100.0
    d = DENSITY_MG_C_PER_HA
    scenarios: List[Dict[str, Any]] = []
    for sc in scenario_defs:
        pts: List[Dict[str, Any]] = [
            _point(0, end_t, end_area, u_area * end_area, d, u_factor, aoi_area_ha)
        ]
        for h in range(1, horizon_years + 1):
            area = end_area + sc["rate"] * h
            spread = SCENARIO_ASSUMPTION_SPREAD * abs(sc["rate"] * h) if sc["assumed"] else 0.0
            half = math.sqrt((1.96 * slope_se * h) ** 2 + spread ** 2 + (u_area * end_area) ** 2)
            pts.append(_point(h, end_t + h, area, half, d, u_factor, aoi_area_ha))
        scenarios.append(
            {
                "id": sc["id"],
                "name": sc["name"],
                "nameBn": sc["nameBn"],
                "description": sc["description"],
                "annualNetChangeHa": round(sc["rate"], 2),
                "points": pts,
            }
        )

    return {
        "method": "Linear trend + what-if rate scenarios (illustrative, not a forecast)",
        "trendHaPerYear": round(slope, 2),
        "trendStdErrHaPerYear": round(slope_se, 2),
        "observedGrossGainHaPerYear": round(gain_rate, 2),
        "observedGrossLossHaPerYear": round(loss_rate, 2),
        "horizonYears": horizon_years,
        "scenarios": scenarios,
    }


def _point(h: int, t: float, area: float, half: float, d: float, u_factor: float, cap: float) -> Dict[str, Any]:
    area_c = min(max(area, 0.0), cap)
    lo, hi = min(max(area - half, 0.0), cap), min(max(area + half, 0.0), cap)
    carbon = area_c * d
    c_half = math.sqrt((d * half) ** 2 + (u_factor * carbon) ** 2)
    return {
        "yearsAhead": h,
        "decimalYear": round(t, 3),
        "year": int(math.floor(t)),
        "mangroveHa": round(area_c, 2),
        "lowHa": round(lo, 2),
        "highHa": round(hi, 2),
        "carbonMgC": round(carbon, 1),
        "carbonLowMgC": round(max(0.0, carbon - c_half), 1),
        "carbonHighMgC": round(carbon + c_half, 1),
    }
