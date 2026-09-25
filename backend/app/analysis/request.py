"""Validation of an analysis request and the observation windows it implies."""
import hashlib
import json
import math
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

# Sentinel-2 L2A (harmonised) coverage over the Sundarbans is reliable from 2019,
# which is also the first year of the classifier's training labels.
MIN_DATE = date(2019, 1, 1)
MIN_SPAN_DAYS = 180
MIN_RADIUS_KM = 0.5
MAX_RADIUS_KM = 10.0
MIN_WINDOW_DAYS = 30
MAX_WINDOW_DAYS = 180

# Rough envelope of the Sundarban delta (India + Bangladesh). Outside it the
# analysis still runs, but the carbon factors and training labels fit less well.
SUNDARBAN_BBOX = {"south": 21.4, "north": 22.8, "west": 88.0, "east": 89.95}

# Default dry-season window used for the in-between years of the timeline.
DRY_SEASON = ((1, 1), (3, 31))


class AnalysisRequestError(ValueError):
    """Raised for a request the analysis cannot run; message is user-facing."""


def _decimal_year(d: date) -> float:
    start = date(d.year, 1, 1)
    days_in_year = (date(d.year + 1, 1, 1) - start).days
    return round(d.year + (d - start).days / days_in_year, 4)


def _period(key: str, label: str, start: date, end: date) -> Dict[str, Any]:
    mid = start + (end - start) / 2
    return {
        "key": key,
        "label": label,
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "midDate": mid.isoformat(),
        "decimalYear": _decimal_year(mid),
    }


@dataclass(frozen=True)
class AnalysisRequest:
    lat: float
    lon: float
    radius_km: float
    start_date: date
    end_date: date
    window_days: int = 90
    language: str = "en"
    use_ai: bool = False

    # ------------------------------------------------------------------ #
    def validate(self, today: Optional[date] = None) -> List[str]:
        """Raise AnalysisRequestError for invalid input; return non-fatal warnings."""
        today = today or date.today()
        if not (-90.0 <= self.lat <= 90.0) or not (-180.0 <= self.lon <= 180.0):
            raise AnalysisRequestError("Latitude/longitude out of range.")
        if not (MIN_RADIUS_KM <= self.radius_km <= MAX_RADIUS_KM):
            raise AnalysisRequestError(
                f"Radius must be between {MIN_RADIUS_KM} and {MAX_RADIUS_KM} km."
            )
        if not (MIN_WINDOW_DAYS <= self.window_days <= MAX_WINDOW_DAYS):
            raise AnalysisRequestError(
                f"Composite window must be between {MIN_WINDOW_DAYS} and {MAX_WINDOW_DAYS} days."
            )
        if self.start_date < MIN_DATE:
            raise AnalysisRequestError(f"Start date must be on or after {MIN_DATE.isoformat()} (Sentinel-2 L2A coverage).")
        if self.end_date > today:
            raise AnalysisRequestError("End date cannot be in the future.")
        span = (self.end_date - self.start_date).days
        if span < MIN_SPAN_DAYS:
            raise AnalysisRequestError(f"Pick dates at least {MIN_SPAN_DAYS} days apart to measure change.")
        if 2 * self.window_days > span:
            raise AnalysisRequestError(
                "The start and end composite windows overlap; shorten the window or widen the date range."
            )
        if self.language not in ("en", "bn"):
            raise AnalysisRequestError("Language must be 'en' or 'bn'.")

        warnings: List[str] = []
        if not self.inside_sundarban:
            warnings.append(
                "Location is outside the Sundarban delta: IPCC mangrove carbon factors and the "
                "mangrove training labels may not apply here."
            )
        month_gap = abs(self.start_date.month - self.end_date.month)
        month_gap = min(month_gap, 12 - month_gap)
        if month_gap > 2:
            warnings.append(
                "Start and end dates fall in different seasons; tide level and leaf phenology "
                "can then look like change. Same-season dates (e.g. Jan–Mar) compare best."
            )
        return warnings

    # ------------------------------------------------------------------ #
    @property
    def inside_sundarban(self) -> bool:
        b = SUNDARBAN_BBOX
        return b["south"] <= self.lat <= b["north"] and b["west"] <= self.lon <= b["east"]

    @property
    def aoi_area_ha(self) -> float:
        return round(math.pi * (self.radius_km * 1000.0) ** 2 / 10_000.0, 2)

    @property
    def span_years(self) -> float:
        return round((self.end_date - self.start_date).days / 365.25, 3)

    @property
    def scale_m(self) -> int:
        """Analysis pixel size: 10 m for small AOIs, 20 m keeps big ones fast."""
        return 10 if self.radius_km <= 3.0 else 20

    def periods(self) -> List[Dict[str, Any]]:
        """Observation windows: start, dry season of each in-between year, end."""
        w = timedelta(days=self.window_days)
        start_win = (self.start_date, self.start_date + w)
        end_win = (self.end_date - w, self.end_date)

        periods = [_period("start", f"Start ({self.start_date.isoformat()})", *start_win)]
        (sm, sd), (em, ed) = DRY_SEASON
        for year in range(self.start_date.year, self.end_date.year + 1):
            ds, de = date(year, sm, sd), date(year, em, ed)
            if ds > start_win[1] and de < end_win[0]:
                periods.append(_period(f"y{year}", f"{year} dry season", ds, de))
        periods.append(_period("end", f"End ({self.end_date.isoformat()})", *end_win))
        return periods

    def cache_key(self) -> str:
        payload = asdict(self)
        payload.pop("language")  # numbers do not depend on language
        payload.pop("use_ai")
        payload["lat"] = round(self.lat, 5)
        payload["lon"] = round(self.lon, 5)
        return hashlib.sha1(json.dumps(payload, default=str, sort_keys=True).encode()).hexdigest()[:16]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "radiusKm": self.radius_km,
            "startDate": self.start_date.isoformat(),
            "endDate": self.end_date.isoformat(),
            "windowDays": self.window_days,
            "language": self.language,
            "aoiAreaHa": self.aoi_area_ha,
            "spanYears": self.span_years,
            "scaleM": self.scale_m,
            "insideSundarban": self.inside_sundarban,
        }
