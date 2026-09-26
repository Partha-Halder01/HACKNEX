# 🌿 MangroveLens

> **AI & Satellite Mangrove Intelligence & Blue Carbon Ecosystem Platform**  
> An open-source, evidence-grounded climate intelligence platform combining Sentinel-2 Earth Observation, Random Forest machine learning, IPCC Tier 1 blue carbon accounting, and Google Gemini AI insights for coastal ecosystem monitoring in the Sundarban delta.

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Pytest](https://img.shields.io/badge/Tests-130%20Passed-brightgreen.svg)](https://docs.pytest.org/)

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Quick Start (One-Click for Windows)](#-quick-start-one-click-for-windows)
- [Step-by-Step Manual Setup](#-step-by-step-manual-setup)
  - [1. Clone and Navigate](#1-clone-and-navigate-to-project)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Frontend Setup (React + Vite)](#3-frontend-setup-react--vite)
- [Key Application URLs & Ports](#key-application-urls--ports)
- [Available Scripts & Testing](#available-scripts--testing)
- [Environment Configuration](#environment-configuration)
- [Project Directory Structure](#project-directory-structure)
- [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Overview

The **MangroveLens** platform empowers local village panchayats, conservation planners, and researchers with accessible, verified coastal ecosystem intelligence:

1. **Earth Observation & Classification**: Sentinel-2 Bottom-of-Atmosphere (BOA) reflectance + 5-Class Random Forest classifier (Mangrove, Water, Aquaculture, Bare Land, Other Vegetation).
2. **Multi-Temporal Change Detection**: Quantifies gross mangrove gain, gross loss, and net canopy transitions between baseline (2020) and recent years with scientific guardrails.
3. **IPCC Tier 1 Blue Carbon Accounting**: Conservative, peer-reviewed estimation across Aboveground Biomass (AGB), Belowground Biomass (BGB), and Soil Organic Carbon (SOC) with Gaussian uncertainty propagation ($\pm 18.3\%$).
4. **AI Evidence Registry & Insights**: Deterministic environmental numbers interpreted via Google Gemini AI with strict hallucination checks and automatic deterministic fallback.
5. **Community-Accessible & Bilingual**: Plain-language summaries, interactive GIS mapping, and bilingual (English/Bengali) reporting.
6. **3-Tier Resilience Architecture**: Runs seamlessly out of the box in high-fidelity demo mode even when Google Earth Engine or MongoDB are unconfigured or offline.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend             │
│            http://localhost:5173 /dashboard            │
└───────────────────────────┬────────────────────────────┘
                            │ Vite Dev Proxy (/api)
                            ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI Backend (Port 8000)              │
│                 http://localhost:8000/api              │
├───────────────────────────┬────────────────────────────┤
│   Live / GEE Engine       │   High-Fidelity Demo       │
│  - Sentinel-2 L2A BOA     │   - Deterministic spatial  │
│  - Cloud-masked composite │     fallback metrics       │
│  - Random Forest Classif. │   - Zero external keys req │
├───────────────────────────┴────────────────────────────┤
│ Analytics Layer:                                       │
│  - IPCC Tier 1 Blue Carbon (283.1 Mg C/ha ± 18.3%)     │
│  - 5-Year Temporal Change Detection                    │
│  - Google Gemini Narrative Interpreter (w/ fallback)   │
│  - MongoDB Storage (w/ local in-memory fallback)       │
└────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before running the project, ensure you have the following installed on your machine:

| Requirement | Supported Versions | Check Version Command |
| :--- | :--- | :--- |
| **Python** | 3.10, 3.11, 3.12, 3.13 | `python --version` or `python3 --version` |
| **Node.js** | v18.0.0 or higher (v20+ recommended) | `node --version` |
| **npm** | v9.0.0 or higher | `npm --version` |
| **Git** | Any modern version | `git --version` |

> [!NOTE]
> **External services are optional!**
> - **MongoDB**: Not required for basic runs. If MongoDB is offline, the backend automatically switches to an in-memory fallback.
> - **Google Earth Engine (GEE)**: Not required. When credentials are not supplied, the backend provides high-fidelity deterministic demo data.
> - **Google Gemini API Key**: Optional. The system generates structured rule-based reports if an API key is not present.

---

## 🚀 Quick Start — backend (Python) and frontend (npm), separately

Run each part in its own terminal. They work the same on Windows, macOS and Linux.

### Backend — Python

```bash
cd backend
python install.py      # first time only: creates .venv, installs packages, creates .env
python run.py          # every day: API on http://localhost:8000 (auto-reloads on code changes)
```

Any `python` (3.10+) works — `run.py` / `install.py` switch into `backend/.venv` by themselves, so there
is nothing to activate. Options: `python run.py --port 8001`, `python run.py --no-reload`.
From the project root you can also use `python backend/run.py`.

### Frontend — npm

```bash
npm install            # first time only
npm run dev            # every day: website on http://localhost:5173
```

Then open **http://localhost:5173/dashboard**. Stop either one with **Ctrl+C**.

### Shortcuts (optional)

| Command | Same as |
| :--- | :--- |
| `npm run setup` | `python backend/install.py` |
| `npm run backend` | `python backend/run.py` |
| `npm run frontend` | `npm run dev` |
| `npm start` | backend + frontend in one terminal (Ctrl+C stops both) |
| `npm run test:backend` | backend test suite (always offline; never uses real keys) |
| `start.bat` (Windows) | double-click: installs what is missing, runs both, opens the browser |

---

## Key Application URLs & Ports

| Component | URL | Description |
| :--- | :--- | :--- |
| **Frontend Dashboard** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Main public interactive analytics dashboard |
| **Frontend Landing Page** | [http://localhost:5173/](http://localhost:5173/) | Public platform overview & before/after visualizer |
| **Backend API Root** | [http://localhost:8000/api](http://localhost:8000/api) | Authoritative FastAPI gateway root |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger UI for exploring and testing API endpoints |
| **ReDoc API Documentation**| [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean alternate API documentation |
| **Backend Health Check** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Real-time status of DB and engines |
| **Earth Engine Basemap** | [http://localhost:8000/api/analysis/basemap](http://localhost:8000/api/analysis/basemap) | Sentinel-2 dry-season photo tiles of the Sundarbans (cached 6 h) |
| **Engine Capabilities** | [http://localhost:8000/api/analysis/capabilities](http://localhost:8000/api/analysis/capabilities) | Live vs Demo engine status & input parameters |

---

## Available Scripts & Testing

### Backend Automated Test Suite (130 Tests)

To run the complete automated test suite (including route validation, carbon calculations, and fallback integrity):

```bash
npm run test:backend
```

### Frontend Production Build

To verify TypeScript typing and bundle the frontend for production:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## Environment Configuration

The backend reads settings from `backend/.env`. Key parameters:

```ini
# Core Environment
ENVIRONMENT=development
FRONTEND_ORIGIN=http://localhost:5173
API_PREFIX=/api

# MongoDB (Optional - in-memory fallback is used if empty or offline)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=sundarban_blue_carbon

# Google Earth Engine (Optional - set GEE_ENABLED=true for live satellite analysis)
GEE_ENABLED=false
GEE_PROJECT_ID=sundarban-blue-carbon
GEE_SERVICE_ACCOUNT=hacknex@sundarban-blue-carbon.iam.gserviceaccount.com
GEE_PRIVATE_KEY_FILE=secrets/gee-service-account.json

# Google Gemini AI (Optional - rule-based fallback used if missing)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## Project Directory Structure

```text
HACKNEX/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── analysis/           # Analysis engine (live GEE, demo engine, carbon, reliability)
│   │   ├── api/                # FastAPI routers and controllers
│   │   ├── core/               # App configuration & settings
│   │   ├── db/                 # MongoDB async Motor driver & indexes
│   │   ├── intelligence/       # Gemini AI narrative generator & guardrails
│   │   ├── schemas/            # Pydantic v2 data models
│   │   ├── services/           # Domain business logic services
│   │   └── templates/          # Bilingual Jinja2 & PDF report templates
│   ├── data/                   # Pilot GeoJSON AOIs and fallback datasets
│   ├── models/                 # Pretrained Random Forest model (.joblib & .json)
│   ├── scripts/                # Seeding and utility scripts
│   ├── tests/                  # Pytest automated test suite (130 tests)
│   ├── .env.example            # Backend environment variables template
│   └── requirements.txt        # Python package dependencies
├── src/                        # React 19 Frontend application
│   ├── components/
│   │   ├── analytics/          # Analytics dashboard, charts, Leaflet map, panels
│   │   ├── common/             # Reusable UI components (Buttons, Logo)
│   │   └── landing/            # Landing page hero, BeforeAfter slider, mockup
│   ├── pages/                  # Page containers (LandingPage, AnalyticsPage)
│   ├── services/               # API client service layer
│   ├── types/                  # TypeScript domain interfaces
│   ├── App.tsx                 # Routing & application shell
│   └── main.tsx                # React DOM entry point
├── docs/                       # Exhaustive methodology and architecture documentation
├── public/                     # Static web assets
├── start.bat                   # 1-Click launcher script for Windows
├── vite.config.ts              # Vite configuration & /api proxy to port 8000
├── package.json                # Frontend package dependencies & scripts
└── README.md                   # Project documentation & run guide
```

---

## Troubleshooting & FAQs

### 1. PowerShell Script Execution Policy Error
**Symptom**: `File ... Activate.ps1 cannot be loaded because running scripts is disabled on this system.`  
**Solution**: Open PowerShell and run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then run `.\backend\.venv\Scripts\Activate.ps1` again.

---

### 2. "Cannot reach the analysis server. Is the backend running on port 8000?"
**Symptom**: The frontend shows an alert or red banner indicating it cannot communicate with the backend.  
**Solution**:
1. Check that the backend server is running in terminal 1 on port 8000:
   ```bash
   python -m uvicorn app.main:app --app-dir backend --port 8000
   ```
2. Test [http://localhost:8000/api/health](http://localhost:8000/api/health) in your browser.
3. If running on another port or remote server, specify `VITE_API_URL=http://your-host:port` in your frontend environment.

---

### 3. Port Already in Use (8000 or 5173)
**Symptom**: `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)`  
**Solution**:
- Identify and terminate the process holding the port:
  ```powershell
  # Check which process is using port 8000
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess
  # Or specify a different port when launching uvicorn
  python -m uvicorn app.main:app --app-dir backend --port 8001
  ```

---

### 4. Running Without Internet or External Credentials
**Question**: *Do I need a Google Cloud account, Earth Engine approval, or paid API keys to test this prototype?*  
**Answer**: **No.** The platform was intentionally designed with a high-fidelity deterministic fallback engine. When GEE or Gemini credentials are omitted, the application runs entirely locally using calibrated pilot baseline models for Gosaba and the Sundarban delta. All core features (mapping, gain/loss calculations, carbon accounting, scenarios, and charts) remain fully functional.

---

### 5. Bengali Typography in PDF Reports
**Note**: To generate bilingual Bengali PDF downloads with proper Bengali Unicode glyph rendering, ensure `NotoSansBengali-Regular.ttf` is placed in `backend/app/templates/fonts/`. If omitted, the PDF engine falls back cleanly to standard Latin characters.


python run.py