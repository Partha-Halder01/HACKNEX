# Sundarban Blue Carbon — FastAPI Backend Gateway

Authoritative Python FastAPI backend gateway for Sundarban mangrove ecosystem intelligence, model-based blue-carbon estimation, and localized village report generation.

---

## 1. Technology Stack

- **Framework**: FastAPI (Python 3.10+) + Uvicorn
- **Validation**: Pydantic v2 (CamelCase serialization for frontend parity)
- **Database**: MongoDB (Atlas Free Tier or Local Community Server)
- **Driver**: Motor (Async MongoDB driver)
- **Spatial Features**: GeoJSON (`[longitude, latitude]`) + MongoDB `2dsphere` spatial indexes
- **Database GUI**: MongoDB Compass
- **AI Intelligence**: Google Gemini API (`google-generativeai`) with safe fallback
- **Satellite & Geospatial**: Google Earth Engine (`earthengine-api`) + Sentinel-2 Surface Reflectance Harmonized
- **Report & Document Engine**: Jinja2 + ReportLab (Bilingual Bengali & English PDF generation)
- **Testing**: Pytest (45 automated test cases)

---

## 2. Quick Start

### 2.1 Virtual Environment Setup

```bash
cd backend
python -m venv .venv
```

**Activate Environment:**
- **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
- **Windows (CMD)**: `.venv\Scripts\activate.bat`
- **Linux / macOS**: `source .venv/bin/activate`

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.3 Configure Environment Variables

Create `.env` based on `.env.example`:

```ini
APP_NAME=Sundarban Blue Carbon API
APP_VERSION=0.1.0
ENVIRONMENT=development
FRONTEND_ORIGIN=http://localhost:5173
API_PREFIX=/api

# MongoDB URI (Atlas or Local Community Server)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=sundarban_blue_carbon

# Optional Google Gemini API Key for AI report enhancement
GEMINI_API_KEY=

# Google Earth Engine (GEE) Configuration
# Default is 'false' so backend boots safely without credentials.
GEE_ENABLED=false
GEE_PROJECT_ID=
GEE_SERVICE_ACCOUNT=
GEE_PRIVATE_KEY_FILE=

# Sentinel-2 Satellite Ingestion Parameters
SENTINEL_COLLECTION=COPERNICUS/S2_SR_HARMONIZED
SENTINEL_CLOUD_PERCENT=30

# Pilot Area of Interest (AOI) Configuration
SUNDARBAN_AOI_SOURCE=Gosaba-Satjelia Pilot Sector
SUNDARBAN_AOI_PATH=data/aoi/sundarban_pilot.geojson

# Seasonal Analytical Window (January 1 - March 31 Post-Monsoon Dry Season)
SENTINEL_START_MONTH=1
SENTINEL_START_DAY=1
SENTINEL_END_MONTH=3
SENTINEL_END_DAY=31
```

---

## 3. Google Earth Engine (GEE) Integration

### 3.1 GEE Authentication Options
The backend supports two authentication mechanisms for Earth Engine:

1. **Local Developer Authentication**:
   ```bash
   earthengine authenticate
   ```
   Then set `GEE_ENABLED=true` and `GEE_PROJECT_ID=your-cloud-project-id` in `.env`.

2. **Service Account Authentication**:
   Set `GEE_ENABLED=true`, `GEE_SERVICE_ACCOUNT=your-sa@project.iam.gserviceaccount.com`, and `GEE_PRIVATE_KEY_FILE=path/to/key.json`.

> [!NOTE]
> When `GEE_ENABLED=false` (default), the backend starts immediately and delivers high-fidelity demo fallback observations with explicit metadata (`dataSource="demo_fallback"`, `isRealData=false`).

---

## 4. Database Management & MongoDB Compass

### 4.1 Seeding MongoDB
Populate MongoDB collections with GeoJSON pilot sectors, spatial polygons, land cover, and bilingual reports:

```bash
python scripts/seed_mongodb.py
```

### 4.2 Inspecting with MongoDB Compass
1. Open **MongoDB Compass**.
2. Connect to your `MONGODB_URI` (e.g., `mongodb://localhost:27017` or Atlas connection string).
3. Select database: `sundarban_blue_carbon`.
4. Inspect collections:
   - `geospatial_observations`: Raw Sentinel-2 band statistics, NDVI/NDWI metrics, and `2dsphere` indexed geometry.
   - `villages`: Notice `location` field with GeoJSON `Point` coordinates `[longitude, latitude]` and `2dsphere` index.
   - `monitoring`: Notice `polygons.geometry` with GeoJSON `Polygon` coordinates.
   - `land_cover`, `change_detection`, `timeseries`, `carbon_estimates`, `reports`, `data_sources`.

---

## 5. Running the Development Server

```bash
uvicorn app.main:app --reload --port 8000
```

- **API Base URL**: `http://localhost:8000/api`
- **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Geospatial Status**: [http://localhost:8000/api/geospatial/status](http://localhost:8000/api/geospatial/status)
- **Sentinel-2 Observations**: [http://localhost:8000/api/geospatial/observations?village_id=gosaba&year=2025](http://localhost:8000/api/geospatial/observations?village_id=gosaba&year=2025)

---

## 6. Automated Testing

Run the deterministic test suite:

```bash
python -m pytest backend/tests
```

To run the optional live Google Earth Engine integration test (requires configured GEE credentials):

```bash
python -m pytest backend/tests -m integration
```

---

## 7. Three-Tier Resilience Fallback

```
                    ┌── GEE & MongoDB available ──→ Real Sentinel-2 composite + MongoDB
Frontend → FastAPI ─┤
                    └── GEE/DB unavailable ───────→ Backend high-fidelity demo fallback
                           
FastAPI server offline ───────────────────────────→ Frontend mockData.ts
```
