"""Core application configuration."""
from pathlib import Path
from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "MangroveLens API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    API_PREFIX: str = "/api"

    # MongoDB Atlas / Community Server Configuration
    MONGODB_URI: Optional[str] = None
    MONGODB_DATABASE: str = "sundarban_blue_carbon"

    # Google Gemini API Key
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Live analysis: cache results in memory per (location, dates, window).
    ANALYSIS_CACHE_SIZE: int = 64
    # Where field-verification points are appended when MongoDB is offline.
    FIELD_POINTS_PATH: str = "data/field_points.jsonl"

    # Custom font directory for PDF rendering (e.g. Noto Sans Bengali)
    FONT_DIR: Optional[str] = None

    # Google Earth Engine (GEE) Configuration
    GEE_ENABLED: bool = False
    GEE_PROJECT_ID: Optional[str] = None
    GEE_SERVICE_ACCOUNT: Optional[str] = None
    GEE_PRIVATE_KEY_FILE: Optional[str] = None
    # Alternative to GEE_PRIVATE_KEY_FILE: the service-account JSON as a string
    # (convenient for hosted environments that only support env vars).
    GEE_PRIVATE_KEY_JSON: Optional[str] = None

    # --- Reference labels for classifier training (CGMD-AFCC30 mangrove maps) ---
    # Verified layout: an ee.ImageCollection of regional tiles (one image per tile per
    # year, 1984-2023), property "year", band "FCC" = mangrove fractional canopy cover
    # in percent (0-100); pixels with no mangrove are masked.
    CGMD_ASSET_ID: str = "projects/mangrovedatahub2/assets/CGMD-AFCC30"
    # "collection": tiles mosaicked per year (the real CGMD layout).
    # "image_bands": one ee.Image with a band per year named by CGMD_BAND_PATTERN.
    CGMD_ASSET_TYPE: str = "collection"
    CGMD_BAND_PATTERN: str = "year_{year}"
    CGMD_YEAR_PROPERTY: str = "year"
    CGMD_LABEL_BAND: str = "FCC"
    # "fraction": band is canopy cover %; mangrove = >= CGMD_MANGROVE_MIN_FCC,
    #             non-mangrove = masked/<= CGMD_NON_MANGROVE_MAX_FCC, mixed pixels excluded.
    # "binary":   band == CGMD_MANGROVE_VALUE is mangrove, everything else is not.
    CGMD_VALUE_MODE: str = "fraction"
    CGMD_MANGROVE_MIN_FCC: int = 50
    CGMD_NON_MANGROVE_MAX_FCC: int = 0
    CGMD_MANGROVE_VALUE: int = 1
    CGMD_SCALE_METERS: int = 30
    # Years of CGMD shown as historical context (separate from the Sentinel-2 series).
    CGMD_HISTORY_YEARS: List[int] = [1990, 1995, 2000, 2005, 2010, 2015, 2018]

    # --- GEE Random Forest pipeline ---
    PIPELINE_TRAIN_YEARS: List[int] = [2019, 2020, 2021, 2022]
    PIPELINE_TEST_YEAR: int = 2023
    PIPELINE_PREDICT_YEARS: List[int] = [2019, 2020, 2021, 2022, 2023, 2024, 2025]
    PIPELINE_SAMPLES_PER_CLASS: int = 1000
    PIPELINE_TEST_SAMPLES_PER_CLASS: int = 500
    PIPELINE_RF_TREES: int = 200
    PIPELINE_SEED: int = 42
    PIPELINE_SCALE_METERS: int = 10
    # Erode reference labels by this many metres so 30 m CGMD edges do not
    # contaminate 10 m training samples.
    PIPELINE_EDGE_BUFFER_METERS: int = 30
    # Changes smaller than this are treated as noise (minimum mapping unit).
    PIPELINE_MIN_MAPPING_UNIT_HA: float = 0.5
    # Pixels below this probability are reported as "uncertain".
    PIPELINE_CONFIDENCE_THRESHOLD: float = 0.6
    PIPELINE_RESULTS_DIR: str = "data/pipeline_results"

    # Sentinel-2 Satellite Ingestion Parameters
    SENTINEL_COLLECTION: str = "COPERNICUS/S2_SR_HARMONIZED"
    SENTINEL_CLOUD_PERCENT: int = 30

    # Pilot Area of Interest (AOI) Configuration
    SUNDARBAN_AOI_SOURCE: str = "Gosaba-Satjelia Pilot Sector"
    SUNDARBAN_AOI_PATH: str = "data/aoi/sundarban_pilot.geojson"

    # Default Seasonal Analytical Window (January 1 - March 31 Post-Monsoon Dry Season)
    SENTINEL_START_MONTH: int = 1
    SENTINEL_START_DAY: int = 1
    SENTINEL_END_MONTH: int = 3
    SENTINEL_END_DAY: int = 31

    # Allowed local frontend origins for CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        # backend/.env, regardless of the directory the server is started from
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
