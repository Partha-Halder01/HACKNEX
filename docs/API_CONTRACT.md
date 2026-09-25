# Sundarban Blue Carbon — Backend API Contract (Phase 2)

> **STATUS**: **IMPLEMENTED IN PHASE 2** (FastAPI Gateway + MongoDB Motor Driver + Gemini + ReportLab)  
> **Backend Framework**: FastAPI (Python 3.10+)  
> **Database**: MongoDB (Atlas / Local) with Motor async driver & GeoJSON 2dsphere indexing  
> **Interactive Swagger Docs**: `http://localhost:8000/docs`  
> **OpenAPI JSON**: `http://localhost:8000/openapi.json`  
> **Offline Resilience**: The React frontend and FastAPI backend operate with complete 3-tier fallback when MongoDB or FastAPI are offline.

---

## 1. Implementation Scope & Status

| Layer / Feature | Status | Details |
| :--- | :--- | :--- |
| **FastAPI REST Endpoints** | **IMPLEMENTED (Phase 2 & 3)** | All 15 documented endpoints operational under `/api`. |
| **MongoDB & Motor Driver** | **IMPLEMENTED (Phase 2 & 3)** | Async database connectivity with GeoJSON `Point`/`Polygon` models. |
| **2dsphere Spatial Indexing** | **IMPLEMENTED (Phase 2 & 3)** | Native MongoDB 2dsphere indexes for spatial coordinates and AOI polygons. |
| **Google Earth Engine Integration**| **IMPLEMENTED (Phase 3)** | Sentinel-2 SR Harmonized ingestion, SCL cloud masking, NDVI, NDWI, zonal stats. |
| **Gemini AI Intelligence** | **IMPLEMENTED (Phase 2)** | `google-generativeai` observation generator with safe fallback. |
| **PDF Report Generation** | **IMPLEMENTED (Phase 2)** | ReportLab bilingual (Bengali/English) PDF generator. |
| **Pydantic Schemas** | **IMPLEMENTED (Phase 2 & 3)** | Typed request/response models with camelCase serialization parity. |
| **CORS Middleware** | **IMPLEMENTED (Phase 2)** | Configured for `http://localhost:5173` and local dev origins. |
| **Pytest Automated Suite** | **IMPLEMENTED (Phase 3)** | 45 test cases covering all routes, geospatial queries, GEE fallback, and error handling. |
| **Random Forest ML Inference** | *PLANNED (Phase 4)* | Real spectral band + NDVI/NDWI 5-class land-cover inference. |
| **Scientific Carbon Engine** | *PLANNED (Phase 5)* | Certified allometric carbon stock calculator. |

---

## 2. General Architecture & Standards

- **Base URL**: Configured via `VITE_API_URL` (default: `http://localhost:8000`)
- **Protocol**: HTTP/1.1 or HTTP/2, REST over JSON & binary streaming for PDF
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json` (or `application/pdf` for PDF export)
- **Serialization**: Automatic camelCase JSON serialization matching frontend TypeScript models.

---

## 3. Endpoints Specification

### 3.1 Health Check
- **Endpoint**: `GET /api/health`
- **Purpose**: Verifies backend server health and version.
- **Response Schema (`HealthResponse`)**:
```json
{
  "status": "ok",
  "service": "sundarban-blue-carbon-api",
  "version": "0.1.0"
}
```

---

### 3.2 Overview Metrics
- **Endpoint**: `GET /api/overview`
- **Purpose**: Retrieves top-level platform statistics for hero banners and primary dashboard KPI cards.
- **Query Parameters**:
  - `village_id` *(optional, string)*: Filter metrics to a specific pilot village (e.g., `gosaba`).
- **Response Schema (`OverviewMetrics`)**:
```json
{
  "pilotAreaHa": 1245.0,
  "observationPeriod": "2020–2025",
  "estimatedCarbonTons": 18426.0,
  "activeAlertsCount": 3,
  "mangroveHealthIndex": 84,
  "lastSatelliteSync": "2025-05-15T06:30:00Z",
  "villageId": "gosaba"
}
```

---

### 3.3 Villages & Monitoring Sectors
- **Endpoint**: `GET /api/villages`
- **Purpose**: Lists all registered Sundarban pilot sectors with GPS coordinates, pilot hectare footprints, and descriptions.
- **Query Parameters**: None
- **Response Schema (`Village[]`)**:
```json
[
  {
    "id": "gosaba",
    "name": "Gosaba",
    "bengaliName": "গোসাবা",
    "coordinates": [22.165, 88.805],
    "pilotAreaHa": 1245.0,
    "description": "Gosaba Island pilot zone, South 24 Parganas, Indian Sundarbans.",
    "mangroveCoverPercentage": 62.3
  }
]
```

---

### 3.4 Spatial Monitoring Layers
- **Endpoint**: `GET /api/monitoring`
- **Purpose**: Supplies GeoJSON polygon layers and spatial classifications for Leaflet map rendering.
- **Query Parameters**:
  - `village_id` *(required, string)*: e.g. `gosaba`
  - `year` *(optional, integer)*: Observation year (default: `2025`)
- **Response Schema (`SpatialMonitoringData`)**:
```json
{
  "villageId": "gosaba",
  "villageName": "Gosaba",
  "year": 2025,
  "totalAreaHa": 1245.0,
  "mangroveAreaHa": 775.6,
  "waterAreaHa": 300.0,
  "aquacultureAreaHa": 108.3,
  "bareLandAreaHa": 34.9,
  "otherVegAreaHa": 26.2,
  "polygons": [
    {
      "id": "poly-1",
      "name": "Gosaba Core Mangrove Tract",
      "category": "Mangrove",
      "color": "#16845f",
      "fillColor": "#16845f",
      "coordinates": [[22.175, 88.790], [22.185, 88.825], [22.155, 88.835], [22.145, 88.805], [22.155, 88.785]],
      "areaHa": 420.5,
      "healthIndex": 0.86
    }
  ],
  "satelliteSource": "Copernicus Sentinel-2 MSI",
  "acquisitionDate": "2025-05-15"
}
```

---

### 3.5 Land Cover Classification
- **Endpoint**: `GET /api/land-cover`
- **Purpose**: Returns multi-class land cover distribution percentages and hectare areas for Recharts donut visualization.
- **Query Parameters**:
  - `village_id` *(required, string)*: e.g. `gosaba`
  - `year` *(optional, integer)*: e.g. `2025`
- **Response Schema (`LandCoverDistribution`)**:
```json
{
  "villageId": "gosaba",
  "year": 2025,
  "totalAreaHa": 1245.0,
  "distribution": [
    { "label": "Mangrove", "value": 62.3, "areaHa": 775.6, "color": "#2da66b", "confidence": 91.0 },
    { "label": "Water", "value": 24.1, "areaHa": 300.0, "color": "#3896d8", "confidence": 96.0 },
    { "label": "Aquaculture", "value": 8.7, "areaHa": 108.3, "color": "#f05d57", "confidence": 84.0 },
    { "label": "Bare Land", "value": 2.8, "areaHa": 34.9, "color": "#b98d64", "confidence": 79.0 },
    { "label": "Other Vegetation", "value": 2.1, "areaHa": 26.2, "color": "#9acb55", "confidence": 82.0 }
  ]
}
```

---

### 3.6 Change Detection & Environmental Alerts
- **Endpoint**: `GET /api/change-detection`
- **Purpose**: Computes canopy gain vs loss between baseline and target years, and delivers thresholded disturbance alerts.
- **Query Parameters**:
  - `village_id` *(required, string)*: e.g. `gosaba`
  - `from_year` *(optional, integer)*: Baseline year (default: `2020`)
  - `to_year` *(optional, integer)*: Target year (default: `2025`)
- **Response Schema (`ChangeDetectionResult`)**:
```json
{
  "villageId": "gosaba",
  "fromYear": 2020,
  "toYear": 2025,
  "gainHa": 32.2,
  "lossHa": 12.2,
  "netChangeHa": 20.0,
  "confidenceScore": 87.0,
  "metrics": [
    { "category": "Mangrove Gain", "areaHa": 32.2, "percentageChange": 2.6, "trend": "gain" },
    { "category": "Mangrove Loss", "areaHa": 12.2, "percentageChange": 0.98, "trend": "loss" }
  ],
  "alerts": [
    {
      "id": "alt-1",
      "severity": "high",
      "color": "#ef4b47",
      "title": "Aquaculture expansion detected",
      "location": "North Gosaba Channel",
      "date": "12 May 2025",
      "description": "New shrimp pond excavation encroaching into intertidal mangrove buffer.",
      "affectedAreaHa": 3.4
    }
  ]
}
```

---

### 3.7 Historical Time Series
- **Endpoint**: `GET /api/timeseries`
- **Purpose**: Returns multi-year historical trend points for line and area trend charts.
- **Query Parameters**:
  - `village_id` *(required, string)*: e.g. `gosaba`
- **Response Schema (`TimeSeriesData`)**:
```json
{
  "villageId": "gosaba",
  "data": [
    { "year": "2020", "areaHa": 1080.0, "gainHa": 0.0, "lossHa": 0.0, "carbonStock": 15984.0 },
    { "year": "2021", "areaHa": 1112.0, "gainHa": 38.5, "lossHa": 6.5, "carbonStock": 16457.0 },
    { "year": "2022", "areaHa": 1140.0, "gainHa": 42.0, "lossHa": 14.0, "carbonStock": 16872.0 },
    { "year": "2023", "areaHa": 1188.0, "gainHa": 61.2, "lossHa": 13.2, "carbonStock": 17582.0 },
    { "year": "2024", "areaHa": 1225.0, "gainHa": 49.5, "lossHa": 12.5, "carbonStock": 18130.0 },
    { "year": "2025", "areaHa": 1245.0, "gainHa": 32.2, "lossHa": 12.2, "carbonStock": 18426.0 }
  ]
}
```

---

### 3.8 Model-Based Carbon Estimation
- **Endpoint**: `GET /api/carbon`
- **Purpose**: Generates model-based indicative blue-carbon tonnages using published scientific factors (tCO₂e/ha) and canopy area.
- **Query Parameters**:
  - `village_id` *(required, string)*: e.g. `gosaba`
  - `year` *(optional, integer)*: e.g. `2025`
- **Response Schema (`CarbonEstimate`)**:
```json
{
  "villageId": "gosaba",
  "year": 2025,
  "mangroveAreaHa": 1245.0,
  "scientificFactor": 14.8,
  "factorUnit": "tCO2e/ha",
  "totalCarbonTons": 18426.0,
  "carbonRange": [16200.0, 20700.0],
  "uncertainty": {
    "minEstimate": 16200.0,
    "maxEstimate": 20700.0,
    "confidenceLevel": 85.0,
    "marginOfError": 12.0
  },
  "methodology": {
    "name": "IPCC Tier 1 / Tier 2 Indicative Blue Carbon Model",
    "version": "v1.4-2025",
    "tier": "Tier 2",
    "description": "Above-ground biomass & soil organic carbon stock estimation using multi-spectral canopy indexation and published Indo-Pacific mangrove allometric factors.",
    "disclaimer": "Indicative model-based estimate for conservation planning. Not certified for carbon credit verification."
  },
  "indicativeNote": "Satellite-derived indicative estimate with configured scientific factors. Not certified carbon credit issuance.",
  "isIndicative": true
}
```

---

### 3.9 Bilingual Village Reports (JSON)
- **Endpoint**: `GET /api/villages/{village_id}/reports`
- **Purpose**: Fetches structured bilingual village reports with findings, observations, and prioritized stakeholder actions.
- **Path Parameters**:
  - `village_id` *(string)*: e.g. `gosaba`
- **Query Parameters**:
  - `lang` *(optional, string)*: `bn` (Bengali) or `en` (English), default `bn`.
  - `use_gemini` *(optional, boolean)*: Set `true` to enhance observations via Gemini AI.
- **Response Schema (`VillageReport`)**:
```json
{
  "id": "rep-gosaba-2025-bn",
  "villageId": "gosaba",
  "villageName": "Gosaba",
  "bengaliVillageName": "গোসাবা",
  "region": "South 24 Parganas, Indian Sundarbans",
  "reportDate": "15 May 2025",
  "period": "২০২০–২০২৫",
  "language": "bn",
  "summaryText": "বিগত ৫ বছরে গোসাবা ব্লকে সামগ্রিক বন আচ্ছাদন স্থিতিশীল রয়েছে। কিছু অঞ্চলে বাঁধ ক্ষয় এবং বাগদা চিংড়ি চাষের কারণে ক্ষতি পরিলক্ষিত হয়েছে।",
  "landCoverFindings": {
    "totalAreaHa": 1245.0,
    "mangroveAreaHa": 775.6,
    "mangrovePercentage": 62.3
  },
  "changeFindings": {
    "gainHa": 32.2,
    "lossHa": 12.2,
    "netChangeHa": 20.0
  },
  "carbonEstimate": {
    "estimatedTons": 18426.0,
    "factorUsed": 14.8
  },
  "keyObservations": [
    {
      "id": "obs-1",
      "title": "Canopy Density Stability",
      "detail": "Core mangrove interior maintains 84% average canopy index.",
      "severity": "positive"
    }
  ],
  "recommendedActions": [
    {
      "id": "act-1",
      "title": "Community Mangrove Buffer Planting",
      "description": "Plant Avicennia marina seedlings along vulnerable 2.5km embankment stretch.",
      "priority": "high",
      "stakeholder": "community"
    }
  ]
}
```

---

### 3.10 Bilingual Village Reports (PDF Download)
- **Endpoint**: `GET /api/villages/{village_id}/reports/pdf`
- **Purpose**: Generates and downloads a structured printable PDF report.
- **Path Parameters**:
  - `village_id` *(string)*: e.g. `gosaba`
- **Query Parameters**:
  - `lang` *(optional, string)*: `bn` or `en` (default `bn`).
  - `use_gemini` *(optional, boolean)*: Set `true` to include Gemini AI observations.
- **Response**: Binary stream `application/pdf` with `Content-Disposition: attachment; filename="{village_id}-blue-carbon-report-{lang}.pdf"`.

---

### 3.11 Data Sources & Satellite Telemetry
- **Endpoint**: `GET /api/data-sources`
- **Purpose**: Returns operational status, spectral band specs, and metadata for satellite pipelines.
- **Query Parameters**: None
- **Response Schema (`DataSource[]`)**:
```json
[
  {
    "id": "sentinel-2",
    "name": "Copernicus Sentinel-2 MSI",
    "provider": "European Space Agency (ESA)",
    "type": "Optical Satellite",
    "status": "online",
    "lastUpdated": "2025-05-15",
    "description": "Multi-spectral high-resolution optical imagery covering 13 spectral bands (10m, 20m, 60m).",
    "coverage": "Gosaba & Satjelia Pilot Quadrants (Tile 45QYE)",
    "spatialResolution": "10m (VNIR) / 20m (SWIR)",
    "revisitDays": 5
  }
]
```

---

### 3.12 Geospatial Status & Telemetry (Phase 3)
- **Endpoint**: `GET /api/geospatial/status`
- **Purpose**: Reports Google Earth Engine connection status, configured project ID, active Sentinel collection, and seasonal window.
- **Response Schema (`GeospatialStatusResponse`)**:
```json
{
  "enabled": false,
  "initialized": false,
  "statusCode": "GEE_DISABLED",
  "message": "Google Earth Engine integration is disabled. Using high-fidelity demo fallback.",
  "projectId": null,
  "collectionId": "COPERNICUS/S2_SR_HARMONIZED",
  "aoiSource": "Gosaba-Satjelia Pilot Sector",
  "cloudThresholdPercent": 30,
  "seasonalWindow": {
    "startMonth": 1,
    "startDay": 1,
    "endMonth": 3,
    "endDay": 31
  }
}
```

---

### 3.13 Sentinel-2 Satellite Observations (Phase 3)
- **Endpoint**: `GET /api/geospatial/observations`
- **Purpose**: Returns structured Sentinel-2 multi-spectral observations (B2, B3, B4, B8, B11, B12) and zonal statistics over the pilot AOI.
- **Query Parameters**:
  - `village_id` *(optional, string)*: `gosaba` or `satjelia` (default: `gosaba`).
  - `year` *(optional, integer)*: Observation year `2020` or `2025` (range 2015–2030, default: `2025`).
- **Response Schema (`SentinelObservation`)**:
```json
{
  "villageId": "gosaba",
  "villageName": "Gosaba",
  "year": 2025,
  "source": "Sentinel-2",
  "platform": "Google Earth Engine",
  "collection": "COPERNICUS/S2_SR_HARMONIZED",
  "dataSource": "sentinel2_gee",
  "isRealData": true,
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[88.785, 22.14], [88.845, 22.14], [88.895, 22.165], [88.785, 22.14]]]
  },
  "bands": {
    "B2": { "min": 180.0, "max": 1420.0, "mean": 482.5, "median": 430.0, "stdDev": 125.4 },
    "B3": { "min": 240.0, "max": 1680.0, "mean": 612.8, "median": 580.0, "stdDev": 142.1 },
    "B4": { "min": 190.0, "max": 1850.0, "mean": 456.2, "median": 395.0, "stdDev": 168.7 },
    "B8": { "min": 320.0, "max": 3840.0, "mean": 2480.6, "median": 2650.0, "stdDev": 620.3 },
    "B11": { "min": 210.0, "max": 2450.0, "mean": 1120.4, "median": 1050.0, "stdDev": 310.8 },
    "B12": { "min": 150.0, "max": 1980.0, "mean": 640.2, "median": 580.0, "stdDev": 215.6 }
  },
  "indices": {
    "NDVI": { "min": -0.28, "max": 0.88, "mean": 0.68, "median": 0.74, "stdDev": 0.18 },
    "NDWI": { "min": -0.82, "max": 0.65, "mean": -0.38, "median": -0.44, "stdDev": 0.24 }
  },
  "processing": {
    "collectionId": "COPERNICUS/S2_SR_HARMONIZED",
    "startDate": "2025-01-01",
    "endDate": "2025-03-31",
    "imageCount": 14,
    "cloudThreshold": 30,
    "compositeMethod": "median",
    "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
    "indices": ["NDVI", "NDWI"],
    "resolutionMeters": 20
  }
}
```

---

### 3.14 NDVI & NDWI Spectral Indices (Phase 3)
- **Endpoint**: `GET /api/geospatial/indices`
- **Purpose**: Delivers scientific index analytics with formulas and canopy/water interpretations.
- **Query Parameters**:
  - `village_id` *(optional, string)*: `gosaba` or `satjelia`.
  - `year` *(optional, integer)*: Observation year.
- **Response Schema (`GeospatialIndicesResponse`)**:
```json
{
  "villageId": "gosaba",
  "villageName": "Gosaba",
  "year": 2025,
  "dataSource": "sentinel2_gee",
  "isRealData": true,
  "ndvi": {
    "name": "Normalized Difference Vegetation Index",
    "formula": "(B8 - B4) / (B8 + B4)",
    "bands": { "nir": "B8", "red": "B4" },
    "range": [-1.0, 1.0],
    "statistics": { "min": -0.28, "max": 0.88, "mean": 0.68, "median": 0.74, "stdDev": 0.18 },
    "interpretation": "Canopy greenness, leaf area index proxy, and photosynthetic vigor.",
    "scientificDisclaimer": "Indicator only; does not directly measure biomass or carbon tonnage."
  },
  "ndwi": {
    "name": "Normalized Difference Water Index (McFeeters 1996)",
    "formula": "(B3 - B8) / (B3 + B8)",
    "bands": { "green": "B3", "nir": "B8" },
    "range": [-1.0, 1.0],
    "statistics": { "min": -0.82, "max": 0.65, "mean": -0.38, "median": -0.44, "stdDev": 0.24 },
    "interpretation": "Open water surface delineation and tidal inundation boundary mapping.",
    "scientificDisclaimer": "Uses McFeeters 1996 (Green-NIR). Distinct from Gao (NIR-SWIR) or Xu (MNDWI)."
  }
}
```

---

### 3.15 Map-Ready GeoJSON Preview (Phase 3)
- **Endpoint**: `GET /api/geospatial/preview`
- **Purpose**: Generates GeoJSON FeatureCollection with attached observation properties for Leaflet overlays.
- **Query Parameters**:
  - `village_id` *(optional, string)*
  - `year` *(optional, integer)*
- **Response Schema (`GeospatialPreviewResponse`)**:
```json
{
  "villageId": "gosaba",
  "villageName": "Gosaba",
  "year": 2025,
  "dataSource": "sentinel2_gee",
  "isRealData": true,
  "geojson": {
    "type": "FeatureCollection",
    "name": "Sentinel-2 Observation Preview - Gosaba (2025)",
    "metadata": { "villageId": "gosaba", "year": 2025, "dataSource": "sentinel2_gee", "isRealData": true },
    "features": [
      {
        "type": "Feature",
        "id": "feat_gosaba_2025",
        "properties": {
          "villageId": "gosaba",
          "villageName": "Gosaba",
          "year": 2025,
          "source": "Sentinel-2",
          "platform": "Google Earth Engine",
          "collection": "COPERNICUS/S2_SR_HARMONIZED",
          "dataSource": "sentinel2_gee",
          "isRealData": true,
          "ndviMean": 0.68,
          "ndwiMean": -0.38,
          "imageCount": 14,
          "cloudThreshold": 30,
          "compositeMethod": "median"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[88.785, 22.14], [88.845, 22.14], [88.895, 22.165], [88.785, 22.14]]]
        }
      }
    ]
  }
}
```
