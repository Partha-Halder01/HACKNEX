# MangroveLens — System Architecture Document

## 1. System Overview

**MangroveLens** is a climate intelligence platform designed to monitor mangrove ecosystems, quantify coastal change, model indicative blue-carbon stocks, and translate complex Earth Observation data into localized, community-accessible evidence.

The architecture enforces strict separation of concerns across:
1. **Presentation Layer**: Frozen React 19 + TypeScript + Tailwind CSS UI.
2. **Client-Side API Layer**: Native Fetch service (`src/services/api.ts`) with typed domain contracts and offline mock fallback.
3. **Backend Gateway Layer**: Python FastAPI REST application hosting typed Pydantic models and routes.
4. **Database & Storage Layer**: **MongoDB** with **Motor** (async driver), GeoJSON spatial documents (`[longitude, latitude]`), and `2dsphere` spatial indexes.
5. **Report Intelligence & Document Engine**: **Google Gemini API** (`google-generativeai`) for structured environmental findings + **Jinja2** HTML templates + **ReportLab** bilingual PDF generator.
6. **Earth Observation / Compute Layer (Future)**: Google Earth Engine, Sentinel-2 Level-2A surface reflectance, and Random Forest classification.

---

## 2. End-to-End System Dataflow

```mermaid
graph TD
    User([User / Conservationist / Planner]) -->|Browser Interaction| ReactApp[React 19 + TypeScript Frontend]
    ReactApp -->|Typed Fetch Calls| ApiService[src/services/api.ts Layer]
    ApiService -->|REST JSON / VITE_API_URL| FastAPIGateway[FastAPI Backend Gateway]

    subgraph Backend Architecture (Phase 2 Implemented)
        FastAPIGateway --> CORSMiddleware[CORS Middleware: localhost:5173]
        CORSMiddleware --> APIRouter[backend/app/api/router.py]
        APIRouter --> RouteHandlers[Route Controllers: overview, villages, monitoring, etc.]
        RouteHandlers --> PydanticSchemas[Pydantic Models: CamelModel Serialization]
        RouteHandlers --> ServiceLayer[backend/app/services/]
        
        ServiceLayer --> MotorDriver[Motor Async Driver]
        MotorDriver --> MongoDB[(MongoDB: Atlas / Local)]
        MongoDB --> GeoJSON2dsphere[GeoJSON Points & Polygons + 2dsphere Index]
        
        ServiceLayer --> GeminiService[Gemini API: google-generativeai]
        GeminiService --> ReportEngine[Jinja2 + ReportLab PDF Generator]
    end

    subgraph Future Earth Observation & Cloud Compute (Planned Phase 3+)
        ServiceLayer -.->|Future GEE API| GEE[Google Earth Engine Cloud Compute]
        GEE -.->|Fetch L2A| Sentinel[Copernicus Sentinel-2 MSI Multi-Spectral]
        Sentinel -.-> Preprocess[Cloud Masking, Atmospheric Correction & Resampling]
        Preprocess -.-> Indices[Feature Extraction: NDVI, NDWI, MNDWI, SAVI]
        Indices -.-> RFModel[Random Forest Classifier - 5 Classes]
        RFModel -.-> ChangeEngine[Temporal Change Detection]
        RFModel -.-> CarbonEngine[Model-Based Carbon Stock Estimator]
        ChangeEngine -.-> MongoDB
    end

    subgraph Client State & Visualization
        ApiService --> StateLayer[React State & Hooks]
        StateLayer --> MapView[Leaflet & React-Leaflet Map]
        StateLayer --> ChartsView[Recharts Donut & Trend Area Charts]
        StateLayer --> ReportView[Bilingual Village Report Studio & PDF Downloader]
    end
```

---

## 3. Implementation Status: Current vs Planned

| Layer / Component | Status | Implementation Details |
| :--- | :--- | :--- |
| **Frontend UI & Presentation** | **CURRENT (Phase 1)** | Frozen visual design, landing page, animations, responsive layout, protected dashboard. |
| **Routing & Auth Guard** | **CURRENT (Phase 1)** | History API router with `/login` session persistence and demo credential validation. |
| **Typed Domain Models** | **CURRENT (Phase 1)** | Strict TypeScript definitions in `src/types/` (`monitoring`, `changeDetection`, `carbon`, `reports`, `api`). |
| **Central API Client & Fallback** | **CURRENT (Phase 1/2)**| `src/services/api.ts` connecting to `VITE_API_URL` with offline mock fallback. |
| **FastAPI Backend Gateway** | **CURRENT (Phase 2)** | Python 3.10+ REST service hosting all endpoints, CORS, and Pydantic schemas. |
| **Database & Motor Driver** | **CURRENT (Phase 2)** | Asynchronous Motor driver connecting to MongoDB with automatic static fallback when offline. |
| **GeoJSON & 2dsphere Indexes** | **CURRENT (Phase 2)** | `[longitude, latitude]` coordinates and MongoDB `2dsphere` spatial indexing. |
| **Gemini Report Intelligence** | **CURRENT (Phase 2)** | `google-generativeai` observation generator with safe fallback. |
| **PDF Generation Engine** | **CURRENT (Phase 2)** | ReportLab + Jinja2 bilingual (Bengali/English) PDF report generator. |
| **Automated Test Suite** | **CURRENT (Phase 2)** | Pytest test suite covering all endpoints, parameters, and error handlers (29 passed). |
| **Google Earth Engine Pipeline** | *PLANNED (Phase 3+)* | Server-side Python `earthengine-api` pipeline fetching Sentinel-2 MSI surface reflectance. |
| **Random Forest ML Model** | *PLANNED (Phase 3+)* | Random Forest baseline model trained on 5 land-cover classes. |
| **Certified Carbon Engine** | *PLANNED (Phase 3+)* | Verified allometric biomass carbon stock engine. |

---

## 4. Database & Geospatial Architecture (MongoDB)

### 4.1 Collections
1. `villages`: Monitored pilot sectors with GeoJSON `Point` locations (`[longitude, latitude]`).
2. `monitoring`: Annual spatial classifications with GeoJSON `Polygon` tracts.
3. `land_cover`: 5-class distribution statistics per village/year.
4. `change_detection`: 5-year temporal comparison metrics and disturbance alerts.
5. `timeseries`: Historical timeline trend points (2020–2025).
6. `carbon_estimates`: Model-based indicative carbon tonnages.
7. `reports`: Bilingual executive summaries, findings, and stakeholder actions.
8. `data_sources`: Sentinel-2 MSI and GEE pipeline specifications.

### 4.2 Spatial Indexing
- `db.villages.create_index([("location", "2dsphere")])`
- `db.monitoring.create_index([("polygons.geometry", "2dsphere")])`
- Inspected using **MongoDB Compass** or MongoDB Atlas Data Explorer.

---

## 5. Machine Learning & Classification Pipeline (Planned Future Phases)

### 5.1 MVP Model: Random Forest Classifier
- **Algorithm**: Supervised ensemble Random Forest (`scikit-learn` / GEE native classifier, 100 trees).
- **Feature Space**:
  1. Optical Bands: `B02` (Blue), `B03` (Green), `B04` (Red), `B08` (NIR), `B11` (SWIR-1), `B12` (SWIR-2).
  2. Vegetation Index: `NDVI = (B08 - B04) / (B08 + B04)` (Canopy chlorophyll & vigor).
  3. Water Index: `NDWI = (B03 - B08) / (B03 + B08)` (Open water vs intertidal mudflat separation).
  4. Soil/Moisture Index: `MNDWI` and `SAVI` for edge discrimination.

### 5.2 Target Land-Cover Classes (Strictly 5 Classes)
1. **Mangrove**: Dense to open estuarine mangrove forest canopy.
2. **Water**: Tidal rivers, creeks, estuaries, and ocean waterways.
3. **Aquaculture**: Commercial brackish shrimp ponds and fish embankments (*ghers*).
4. **Bare Land**: Intertidal mudflats, sandbanks, and exposed embankment soil.
5. **Other Vegetation**: Agricultural crops, village homestead trees, and non-mangrove terrestrial greens.

---

## 6. Model-Based Carbon Stock Estimation Framework

> [!IMPORTANT]
> **Scientific Integrity Notice**: Satellite imagery measures multi-spectral surface reflectance and canopy indexation; it **does not directly measure subsurface carbon or belowground biomass**.
> All carbon figures generated by this system are **model-based, indicative estimates** for regional conservation planning and community awareness, not certified carbon credit issuance.

### Calculation Formulation
$$\text{Estimated Carbon (tCO}_2\text{e)} = \text{Mangrove Area (ha)} \times \text{Scientific Factor (tCO}_2\text{e/ha/yr)}$$

- **Scientific Factors**: Published Indo-Pacific mangrove allometric averages (default: `14.8 tCO2e/ha/yr`, configurable range `8.0 – 24.0`).
- **Uncertainty Quantification**: The platform displays a $\pm 12\%$ margin of error with an $85\%$ confidence envelope to maintain scientific transparency during demonstration.
