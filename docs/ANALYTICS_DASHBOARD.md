# Analytics page: location + date range analysis

One public page (`/dashboard`, no login). The user picks a point, a radius and a start/end date; the
backend runs the whole method for that circle and returns one JSON bundle that the page renders.

## API

| Method | Path | Purpose |
| :--- | :--- | :--- |
| GET | `/api/analysis/capabilities` | Live vs demo engine, Gemini configured?, input limits, default request |
| POST | `/api/analysis/run` | Run the analysis (body below) |
| POST | `/api/analysis/field-points` | Save a ground check `{lat, lon, observedClass: mangrove\|other, observedOn, observer?, note?, analysisId?}` |
| GET | `/api/analysis/field-points` | List saved ground checks (newest first) |

`POST /api/analysis/run` body:

```json
{ "lat": 22.165, "lon": 88.805, "radiusKm": 3, "startDate": "2020-01-01", "endDate": "2026-03-31",
  "windowDays": 90, "language": "en", "useAi": false }
```

Limits (422 with a readable message otherwise): start ≥ 2019-01-01, end ≤ today, ≥ 180 days apart,
radius 0.5–10 km, window 30–180 days and the two windows must not overlap. Warnings (not errors) are
returned for points outside the Sundarban delta and for start/end dates in different seasons.

## Observation windows

- **Start**: `startDate` → `startDate + windowDays`
- **Each year in between**: that year's dry season, 1 Jan – 31 Mar (skipped if it overlaps start/end)
- **End**: `endDate − windowDays` → `endDate`

Each window becomes one cloud-masked Sentinel-2 L2A median composite (B2, B3, B4, B8, B11, B12, NDVI, NDWI).
Pixel size is 10 m up to 3 km radius, 20 m above.

## Engines

**Live (`GEE_ENABLED=true` + credentials)** — `backend/app/analysis/gee_engine.py`
1. Random Forest (2 classes) trained on CGMD pixels that were mangrove (or not) in *every* training year
   (`PIPELINE_TRAIN_YEARS`, edges eroded 30 m), sampled in the AOI + 5 km. If either class has < 30
   samples there, training falls back to the Gosaba pilot AOI (reported in *Method*).
2. Accuracy: the model classifies the `PIPELINE_TEST_YEAR` composite and is compared with that year's
   CGMD map, which training never saw → confusion matrix, OA, kappa, F1.
3. Every window is classified; area per class and low-confidence area (max class probability < 0.6).
4. Start vs end: gain, loss, uncertain (change where either date is < 0.6 confident), stable mangrove;
   patches < 0.5 ha dropped.
5. CGMD areas for `CGMD_HISTORY_YEARS` (1990–2018) as separate historical context.
6. GEE tile URLs (true colour, mangrove map start/end, change) for the map; the key stays on the server.

A live failure on the start/end window (no cloud-free images) returns 422 with advice. Any other live
failure falls back to the demo engine **with a warning on the page**.

**Demo (no credentials)** — `backend/app/analysis/demo_engine.py`
Synthetic, location-seeded values in the same shape. Always labelled `isRealData: false`; accuracy,
CGMD history and map layers are left empty rather than invented.

## Analytics (same for both engines)

- **Carbon** (`analysis/carbon.py`): IPCC 2013 Wetlands Supplement Tier 1, AGB 74.2 + BGB 28.9 + SOC 180.0
  = 283.1 Mg C/ha; CO₂e = C × 44/12; no money value.
  - Area uncertainty = (1 − mangrove F1) × 100 %, floor 3.5 % (3.5 % when no accuracy).
  - Stock: `u_C/C = √(u_area² + u_factor²)`, factor ±18 % → ±18.3 % by default.
  - Change: `u_Δarea = √(uncertain_ha² + (u_area·(gain+loss))²)`, `u_ΔC = √((D·u_Δarea)² + (u_factor·ΔC)²)`.
- **Scenarios** (`analysis/projection.py`), 1–5 years from the end date, clamped to [0, AOI area]:
  - *Current trend*: start→end yearly rate (same basis as the headline), band ±1.96·SE·h using the least-squares slope error; the fitted slope is reported as `fittedTrendHaPerYear`.
  - *Higher loss*: trend minus one more observed loss rate (loss doubles).
  - *Recovery*: trend plus half the loss rate and half the gain rate. What-ifs are offsets from the trend, so they never cross it.
  - What-if bands add ±25 % of the assumed change; all bands add the end-area measurement error.
  - Labelled "what-if scenarios, not forecasts".
- **Narrative** (`analysis/narrative.py`): EN + BN template built only from computed numbers. With
  `useAi` and `GEMINI_API_KEY`, Gemini may re-word it from a numbered evidence list; the text is rejected
  (template shown, status on the page) if it cites unknown evidence IDs, matches a forbidden claim, or
  contains any number not within 1 % of an evidence value (years and small counts excepted).

Results are cached in memory per (location, radius, dates, window) — `ANALYSIS_CACHE_SIZE`. When MongoDB
is connected, each run is stored in `analysis_runs` with `modelVersion` and `dataSource`, and field checks
in `field_points`.

## Tests

`backend/tests/test_analysis.py` — request validation and windows, carbon and uncertainty maths,
scenario ordering/bounds, narrative validator (incl. Bengali digits), demo bundle consistency, the live
engine's orchestration against a fake Earth Engine, and the API routes.
