"""Sundarban Blue Carbon — Centralized Demonstration Dataset (Phase 2).

IMPORTANT SCIENTIFIC NOTICE:
These values are demonstration data prepared for API architecture and UI integration.
They are NOT derived from live satellite imagery processing or certified carbon stock auditing.
Real Sentinel-2 ingestion, GEE pipelines, and Random Forest classification will be implemented
in future hackathon phases.
"""

from typing import Dict, Any, List

# =====================================================================
# OVERVIEW KPI METRICS (DEMO)
# =====================================================================
DEMO_OVERVIEW: Dict[str, Any] = {
    "pilot_area_ha": 1245.0,
    "observation_period": "2020–2025",
    "estimated_carbon_tons": 18426.0,
    "active_alerts_count": 3,
    "mangrove_health_index": 84,
    "last_satellite_sync": "2025-05-15T06:30:00Z",
    "village_id": "gosaba",
}

# =====================================================================
# PILOT VILLAGES (DEMO)
# =====================================================================
DEMO_VILLAGES: List[Dict[str, Any]] = [
    {
        "id": "gosaba",
        "name": "Gosaba",
        "bengali_name": "গোসাবা",
        "coordinates": [22.165, 88.805],
        "pilot_area_ha": 1245.0,
        "description": "Gosaba Island pilot zone, South 24 Parganas, Indian Sundarbans.",
        "mangrove_cover_percentage": 62.3,
    },
    {
        "id": "satjelia",
        "name": "Satjelia",
        "bengali_name": "সাতজেলিয়া",
        "coordinates": [22.148, 88.845],
        "pilot_area_ha": 980.0,
        "description": "Satjelia perimeter mangrove transition and embankment buffer.",
        "mangrove_cover_percentage": 58.1,
    },
    {
        "id": "sajnekhali",
        "name": "Sajnekhali",
        "bengali_name": "সজনেখালি",
        "coordinates": [22.128, 88.775],
        "pilot_area_ha": 2150.0,
        "description": "Sajnekhali wildlife sanctuary buffer and primary mangrove core.",
        "mangrove_cover_percentage": 78.4,
    },
    {
        "id": "pabtiabia",
        "name": "Pabtiabia",
        "bengali_name": "পাবতিয়াবিয়া",
        "coordinates": [22.190, 88.750],
        "pilot_area_ha": 830.0,
        "description": "Northern estuarine fringe with active community mangrove planting.",
        "mangrove_cover_percentage": 51.2,
    },
]

# =====================================================================
# SPATIAL MAP POLYGONS (DEMO GEOJSON COORDS)
# =====================================================================
DEMO_MAP_POLYGONS: Dict[str, List[List[List[float]]]] = {
    "mangroves": [
        [
            [22.175, 88.790],
            [22.185, 88.825],
            [22.155, 88.835],
            [22.145, 88.805],
            [22.155, 88.785],
        ],
        [
            [22.135, 88.765],
            [22.145, 88.795],
            [22.115, 88.805],
            [22.105, 88.775],
        ],
    ],
    "water": [
        [
            [22.195, 88.810],
            [22.170, 88.815],
            [22.140, 88.810],
            [22.100, 88.820],
            [22.100, 88.835],
            [22.145, 88.825],
            [22.175, 88.830],
            [22.195, 88.825],
        ],
    ],
    "aquaculture": [
        [
            [22.182, 88.770],
            [22.192, 88.785],
            [22.180, 88.795],
            [22.170, 88.780],
        ],
        [
            [22.138, 88.835],
            [22.148, 88.850],
            [22.135, 88.860],
            [22.125, 88.845],
        ],
    ],
    "bareLand": [
        [
            [22.160, 88.760],
            [22.168, 88.772],
            [22.158, 88.778],
            [22.150, 88.765],
        ],
    ],
}

# =====================================================================
# LAND COVER DISTRIBUTIONS (DEMO)
# =====================================================================
DEMO_LANDCOVER: Dict[str, Dict[str, Any]] = {
    "gosaba": {
        "village_id": "gosaba",
        "year": 2025,
        "total_area_ha": 1245.0,
        "distribution": [
            {"label": "Mangrove", "value": 62.3, "area_ha": 775.6, "color": "#2da66b", "confidence": 91.0},
            {"label": "Water", "value": 24.1, "area_ha": 300.0, "color": "#3896d8", "confidence": 96.0},
            {"label": "Aquaculture", "value": 8.7, "area_ha": 108.3, "color": "#f05d57", "confidence": 84.0},
            {"label": "Bare Land", "value": 2.8, "area_ha": 34.9, "color": "#b98d64", "confidence": 79.0},
            {"label": "Other Vegetation", "value": 2.1, "area_ha": 26.2, "color": "#9acb55", "confidence": 82.0},
        ],
    },
    "satjelia": {
        "village_id": "satjelia",
        "year": 2025,
        "total_area_ha": 980.0,
        "distribution": [
            {"label": "Mangrove", "value": 58.1, "area_ha": 569.4, "color": "#2da66b", "confidence": 89.0},
            {"label": "Water", "value": 28.4, "area_ha": 278.3, "color": "#3896d8", "confidence": 95.0},
            {"label": "Aquaculture", "value": 7.9, "area_ha": 77.4, "color": "#f05d57", "confidence": 82.0},
            {"label": "Bare Land", "value": 3.2, "area_ha": 31.4, "color": "#b98d64", "confidence": 77.0},
            {"label": "Other Vegetation", "value": 2.4, "area_ha": 23.5, "color": "#9acb55", "confidence": 80.0},
        ],
    },
}

# =====================================================================
# TIME-SERIES DATA (DEMO)
# =====================================================================
DEMO_TIMESERIES: Dict[str, Dict[str, Any]] = {
    "gosaba": {
        "village_id": "gosaba",
        "data": [
            {"year": "2020", "area_ha": 1080.0, "gain_ha": 0.0, "loss_ha": 0.0, "carbon_stock": 15984.0},
            {"year": "2021", "area_ha": 1112.0, "gain_ha": 38.5, "loss_ha": 6.5, "carbon_stock": 16457.0},
            {"year": "2022", "area_ha": 1140.0, "gain_ha": 42.0, "loss_ha": 14.0, "carbon_stock": 16872.0},
            {"year": "2023", "area_ha": 1188.0, "gain_ha": 61.2, "loss_ha": 13.2, "carbon_stock": 17582.0},
            {"year": "2024", "area_ha": 1225.0, "gain_ha": 49.5, "loss_ha": 12.5, "carbon_stock": 18130.0},
            {"year": "2025", "area_ha": 1245.0, "gain_ha": 32.2, "loss_ha": 12.2, "carbon_stock": 18426.0},
        ],
    },
    "satjelia": {
        "village_id": "satjelia",
        "data": [
            {"year": "2020", "area_ha": 890.0, "gain_ha": 0.0, "loss_ha": 0.0, "carbon_stock": 13172.0},
            {"year": "2021", "area_ha": 905.0, "gain_ha": 22.0, "loss_ha": 7.0, "carbon_stock": 13394.0},
            {"year": "2022", "area_ha": 920.0, "gain_ha": 25.0, "loss_ha": 10.0, "carbon_stock": 13616.0},
            {"year": "2023", "area_ha": 945.0, "gain_ha": 36.0, "loss_ha": 11.0, "carbon_stock": 13986.0},
            {"year": "2024", "area_ha": 965.0, "gain_ha": 30.0, "loss_ha": 10.0, "carbon_stock": 14282.0},
            {"year": "2025", "area_ha": 980.0, "gain_ha": 23.0, "loss_ha": 8.0, "carbon_stock": 14504.0},
        ],
    },
}

# =====================================================================
# CHANGE DETECTION & DISTURBANCE ALERTS (DEMO)
# =====================================================================
DEMO_CHANGE: Dict[str, Dict[str, Any]] = {
    "gosaba": {
        "village_id": "gosaba",
        "from_year": 2020,
        "to_year": 2025,
        "gain_ha": 32.2,
        "loss_ha": 12.2,
        "net_change_ha": 20.0,
        "confidence_score": 87.0,
        "metrics": [
            {"category": "Mangrove Gain", "area_ha": 32.2, "percentage_change": 2.6, "trend": "gain"},
            {"category": "Mangrove Loss", "area_ha": 12.2, "percentage_change": 0.98, "trend": "loss"},
            {"category": "Aquaculture Expansion", "area_ha": 14.5, "percentage_change": 1.16, "trend": "gain"},
            {"category": "Water Change", "area_ha": 8.4, "percentage_change": 0.67, "trend": "neutral"},
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
                "affected_area_ha": 3.4,
            },
            {
                "id": "alt-2",
                "severity": "medium",
                "color": "#f5b814",
                "title": "Possible mangrove loss / bank erosion",
                "location": "Near Satjelia Ferry Point",
                "date": "08 May 2025",
                "description": "Tidal embankment erosion leading to edge canopy displacement.",
                "affected_area_ha": 1.8,
            },
            {
                "id": "alt-3",
                "severity": "low",
                "color": "#3896d8",
                "title": "New mangrove growth & canopy recovery",
                "location": "East Bidya Channel",
                "date": "28 Apr 2025",
                "description": "Natural regeneration and community planting showing healthy chlorophyll response.",
                "affected_area_ha": 4.2,
            },
        ],
    },
}

# =====================================================================
# MODEL-BASED CARBON ESTIMATES (DEMO)
# =====================================================================
DEMO_CARBON: Dict[str, Dict[str, Any]] = {
    "gosaba": {
        "village_id": "gosaba",
        "year": 2025,
        "mangrove_area_ha": 1245.0,
        "scientific_factor": 14.8,
        "factor_unit": "tCO2e/ha",
        "total_carbon_tons": 18426.0,
        "carbon_range": [16200.0, 20700.0],
        "uncertainty": {
            "min_estimate": 16200.0,
            "max_estimate": 20700.0,
            "confidence_level": 85.0,
            "margin_of_error": 12.0,
        },
        "methodology": {
            "name": "IPCC Tier 1 / Tier 2 Indicative Blue Carbon Model",
            "version": "v1.4-2025",
            "tier": "Tier 2",
            "description": "Above-ground biomass & soil organic carbon stock estimation using multi-spectral canopy indexation and published Indo-Pacific mangrove allometric factors.",
            "disclaimer": "Indicative model-based estimate for conservation planning. Not certified for carbon credit verification.",
        },
        "indicative_note": "Satellite-derived indicative estimate with configured scientific factors. Not certified carbon credit issuance.",
        "is_indicative": True,
    },
}

# =====================================================================
# BILINGUAL VILLAGE REPORTS (DEMO)
# =====================================================================
DEMO_REPORTS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "gosaba": {
        "bn": {
            "id": "rep-gosaba-2025-bn",
            "village_id": "gosaba",
            "village_name": "Gosaba",
            "bengali_village_name": "গোসাবা",
            "region": "South 24 Parganas, Indian Sundarbans",
            "report_date": "15 May 2025",
            "period": "২০২০–২০২৫",
            "language": "bn",
            "summary_text": "বিগত ৫ বছরে গোসাবা ব্লকে সামগ্রিক বন আচ্ছাদন স্থিতিশীল রয়েছে। কিছু অঞ্চলে বাঁধ ক্ষয় এবং বাগদা চিংড়ি চাষের কারণে ক্ষতি পরিলক্ষিত হয়েছে।",
            "land_cover_findings": {
                "total_area_ha": 1245.0,
                "mangrove_area_ha": 775.6,
                "mangrove_percentage": 62.3,
            },
            "change_findings": {
                "gain_ha": 32.2,
                "loss_ha": 12.2,
                "net_change_ha": 20.0,
            },
            "carbon_estimate": {
                "estimated_tons": 18426.0,
                "factor_used": 14.8,
            },
            "key_observations": [
                {
                    "id": "obs-1",
                    "title": "Canopy Density Stability",
                    "detail": "Core mangrove interior maintains 84% average canopy index.",
                    "severity": "positive",
                },
                {
                    "id": "obs-2",
                    "title": "Embankment Vulnerability",
                    "detail": "Tidal scouring identified along North Bidya shoreline.",
                    "severity": "warning",
                },
            ],
            "recommended_actions": [
                {
                    "id": "act-1",
                    "title": "Community Mangrove Buffer Planting",
                    "description": "Plant Avicennia marina seedlings along vulnerable 2.5km embankment stretch.",
                    "priority": "high",
                    "stakeholder": "community",
                },
                {
                    "id": "act-2",
                    "title": "Aquaculture Encroachment Patrol",
                    "description": "Conduct GPS verification of new pond excavation permits in fringe zone.",
                    "priority": "medium",
                    "stakeholder": "panchayat",
                },
            ],
        },
        "en": {
            "id": "rep-gosaba-2025-en",
            "village_id": "gosaba",
            "village_name": "Gosaba",
            "bengali_village_name": "গোসাবা",
            "region": "South 24 Parganas, Indian Sundarbans",
            "report_date": "15 May 2025",
            "period": "2020–2025",
            "language": "en",
            "summary_text": "Over the past 5 years, total mangrove canopy cover across Gosaba block has remained resilient with net positive pioneer growth, offset by localized embankment erosion and aquaculture expansion.",
            "land_cover_findings": {
                "total_area_ha": 1245.0,
                "mangrove_area_ha": 775.6,
                "mangrove_percentage": 62.3,
            },
            "change_findings": {
                "gain_ha": 32.2,
                "loss_ha": 12.2,
                "net_change_ha": 20.0,
            },
            "carbon_estimate": {
                "estimated_tons": 18426.0,
                "factor_used": 14.8,
            },
            "key_observations": [
                {
                    "id": "obs-1",
                    "title": "Canopy Density Stability",
                    "detail": "Core mangrove interior maintains 84% average canopy index.",
                    "severity": "positive",
                },
                {
                    "id": "obs-2",
                    "title": "Embankment Vulnerability",
                    "detail": "Tidal scouring identified along North Bidya shoreline.",
                    "severity": "warning",
                },
            ],
            "recommended_actions": [
                {
                    "id": "act-1",
                    "title": "Community Mangrove Buffer Planting",
                    "description": "Plant Avicennia marina seedlings along vulnerable 2.5km embankment stretch.",
                    "priority": "high",
                    "stakeholder": "community",
                },
                {
                    "id": "act-2",
                    "title": "Aquaculture Encroachment Patrol",
                    "description": "Conduct GPS verification of new pond excavation permits in fringe zone.",
                    "priority": "medium",
                    "stakeholder": "panchayat",
                },
            ],
        },
    },
}

# =====================================================================
# DATA SOURCES & PIPELINES (DEMO / PLANNED STATUS)
# =====================================================================
DEMO_DATA_SOURCES: List[Dict[str, Any]] = [
    {
        "id": "sentinel-2",
        "name": "Copernicus Sentinel-2 MSI",
        "provider": "European Space Agency (ESA)",
        "type": "Optical Satellite",
        "status": "online",
        "last_updated": "2025-05-15",
        "description": "Multi-spectral high-resolution optical imagery covering 13 spectral bands (10m, 20m, 60m).",
        "coverage": "Gosaba & Satjelia Pilot Quadrants (Tile 45QYE)",
        "spatial_resolution": "10m (VNIR) / 20m (SWIR)",
        "revisit_days": 5,
        "bands": [
            {"id": "B02", "name": "Blue", "wavelength": "490 nm", "resolution": "10m", "purpose": "Coastal water depth & atmospheric aerosols"},
            {"id": "B03", "name": "Green", "wavelength": "560 nm", "resolution": "10m", "purpose": "Vegetation reflectance & NDWI"},
            {"id": "B04", "name": "Red", "wavelength": "665 nm", "resolution": "10m", "purpose": "Chlorophyll absorption & NDVI"},
            {"id": "B08", "name": "NIR", "wavelength": "842 nm", "resolution": "10m", "purpose": "Mangrove cellular leaf reflectance & biomass"},
            {"id": "B11", "name": "SWIR-1", "wavelength": "1610 nm", "resolution": "20m", "purpose": "Canopy moisture & soil background separation"},
            {"id": "B12", "name": "SWIR-2", "wavelength": "2190 nm", "resolution": "20m", "purpose": "Aquaculture pond embankments & geology"},
        ],
    },
    {
        "id": "gee-engine",
        "name": "Google Earth Engine Cloud Compute",
        "provider": "Google Cloud Geospatial",
        "type": "Cloud Processing Engine",
        "status": "planned",
        "last_updated": "2025-05-15",
        "description": "Cloud-native planetary-scale geospatial analysis pipeline for Sentinel-2 top-of-atmosphere correction and cloud masking.",
        "coverage": "Sundarbans Delta (India & Bangladesh)",
        "spatial_resolution": "Native 10m pipeline",
        "revisit_days": 1,
    },
]

# =====================================================================
# GEOSPATIAL SENTINEL-2 OBSERVATIONS (DEMO FALLBACK)
# =====================================================================
DEMO_GEOSPATIAL_OBSERVATIONS: Dict[str, Dict[int, Dict[str, Any]]] = {
    "gosaba": {
        2025: {
            "village_id": "gosaba",
            "village_name": "Gosaba",
            "year": 2025,
            "source": "Sentinel-2",
            "platform": "Google Earth Engine",
            "collection": "COPERNICUS/S2_SR_HARMONIZED",
            "data_source": "demo_fallback",
            "is_real_data": False,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [88.7850, 22.1400],
                        [88.8450, 22.1400],
                        [88.8950, 22.1650],
                        [88.9200, 22.2050],
                        [88.8950, 22.2450],
                        [88.8400, 22.2500],
                        [88.7900, 22.2300],
                        [88.7750, 22.1850],
                        [88.7850, 22.1400],
                    ]
                ],
            },
            "bands": {
                "B2": {"min": 180.0, "max": 1420.0, "mean": 482.5, "median": 430.0, "std_dev": 125.4},
                "B3": {"min": 240.0, "max": 1680.0, "mean": 612.8, "median": 580.0, "std_dev": 142.1},
                "B4": {"min": 190.0, "max": 1850.0, "mean": 456.2, "median": 395.0, "std_dev": 168.7},
                "B8": {"min": 320.0, "max": 3840.0, "mean": 2480.6, "median": 2650.0, "std_dev": 620.3},
                "B11": {"min": 210.0, "max": 2450.0, "mean": 1120.4, "median": 1050.0, "std_dev": 310.8},
                "B12": {"min": 150.0, "max": 1980.0, "mean": 640.2, "median": 580.0, "std_dev": 215.6},
            },
            "indices": {
                "NDVI": {"min": -0.28, "max": 0.88, "mean": 0.68, "median": 0.74, "std_dev": 0.18},
                "NDWI": {"min": -0.82, "max": 0.65, "mean": -0.38, "median": -0.44, "std_dev": 0.24},
            },
            "processing": {
                "collection_id": "COPERNICUS/S2_SR_HARMONIZED",
                "start_date": "2025-01-01",
                "end_date": "2025-03-31",
                "image_count": 14,
                "cloud_threshold": 30,
                "composite_method": "median",
                "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
                "indices": ["NDVI", "NDWI"],
                "resolution_meters": 20,
            },
        },
        2020: {
            "village_id": "gosaba",
            "village_name": "Gosaba",
            "year": 2020,
            "source": "Sentinel-2",
            "platform": "Google Earth Engine",
            "collection": "COPERNICUS/S2_SR_HARMONIZED",
            "data_source": "demo_fallback",
            "is_real_data": False,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [88.7850, 22.1400],
                        [88.8450, 22.1400],
                        [88.8950, 22.1650],
                        [88.9200, 22.2050],
                        [88.8950, 22.2450],
                        [88.8400, 22.2500],
                        [88.7900, 22.2300],
                        [88.7750, 22.1850],
                        [88.7850, 22.1400],
                    ]
                ],
            },
            "bands": {
                "B2": {"min": 195.0, "max": 1480.0, "mean": 498.2, "median": 445.0, "std_dev": 130.2},
                "B3": {"min": 255.0, "max": 1710.0, "mean": 628.4, "median": 595.0, "std_dev": 148.6},
                "B4": {"min": 210.0, "max": 1910.0, "mean": 478.1, "median": 415.0, "std_dev": 174.3},
                "B8": {"min": 290.0, "max": 3650.0, "mean": 2340.2, "median": 2490.0, "std_dev": 595.4},
                "B11": {"min": 225.0, "max": 2520.0, "mean": 1165.8, "median": 1090.0, "std_dev": 322.1},
                "B12": {"min": 165.0, "max": 2040.0, "mean": 672.5, "median": 610.0, "std_dev": 228.4},
            },
            "indices": {
                "NDVI": {"min": -0.32, "max": 0.84, "mean": 0.64, "median": 0.70, "std_dev": 0.20},
                "NDWI": {"min": -0.78, "max": 0.68, "mean": -0.34, "median": -0.40, "std_dev": 0.26},
            },
            "processing": {
                "collection_id": "COPERNICUS/S2_SR_HARMONIZED",
                "start_date": "2020-01-01",
                "end_date": "2020-03-31",
                "image_count": 11,
                "cloud_threshold": 30,
                "composite_method": "median",
                "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
                "indices": ["NDVI", "NDWI"],
                "resolution_meters": 20,
            },
        },
    },
    "satjelia": {
        2025: {
            "village_id": "satjelia",
            "village_name": "Satjelia",
            "year": 2025,
            "source": "Sentinel-2",
            "platform": "Google Earth Engine",
            "collection": "COPERNICUS/S2_SR_HARMONIZED",
            "data_source": "demo_fallback",
            "is_real_data": False,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [88.8200, 22.1200],
                        [88.8800, 22.1200],
                        [88.9100, 22.1550],
                        [88.8800, 22.1850],
                        [88.8200, 22.1800],
                        [88.8050, 22.1500],
                        [88.8200, 22.1200],
                    ]
                ],
            },
            "bands": {
                "B2": {"min": 175.0, "max": 1390.0, "mean": 470.1, "median": 420.0, "std_dev": 120.8},
                "B3": {"min": 230.0, "max": 1640.0, "mean": 598.6, "median": 565.0, "std_dev": 138.4},
                "B4": {"min": 185.0, "max": 1810.0, "mean": 442.9, "median": 385.0, "std_dev": 162.5},
                "B8": {"min": 310.0, "max": 3780.0, "mean": 2410.5, "median": 2580.0, "std_dev": 605.2},
                "B11": {"min": 205.0, "max": 2390.0, "mean": 1095.3, "median": 1025.0, "std_dev": 302.4},
                "B12": {"min": 145.0, "max": 1920.0, "mean": 625.8, "median": 565.0, "std_dev": 208.9},
            },
            "indices": {
                "NDVI": {"min": -0.26, "max": 0.86, "mean": 0.66, "median": 0.72, "std_dev": 0.19},
                "NDWI": {"min": -0.80, "max": 0.62, "mean": -0.36, "median": -0.42, "std_dev": 0.25},
            },
            "processing": {
                "collection_id": "COPERNICUS/S2_SR_HARMONIZED",
                "start_date": "2025-01-01",
                "end_date": "2025-03-31",
                "image_count": 13,
                "cloud_threshold": 30,
                "composite_method": "median",
                "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
                "indices": ["NDVI", "NDWI"],
                "resolution_meters": 20,
            },
        },
        2020: {
            "village_id": "satjelia",
            "village_name": "Satjelia",
            "year": 2020,
            "source": "Sentinel-2",
            "platform": "Google Earth Engine",
            "collection": "COPERNICUS/S2_SR_HARMONIZED",
            "data_source": "demo_fallback",
            "is_real_data": False,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [88.8200, 22.1200],
                        [88.8800, 22.1200],
                        [88.9100, 22.1550],
                        [88.8800, 22.1850],
                        [88.8200, 22.1800],
                        [88.8050, 22.1500],
                        [88.8200, 22.1200],
                    ]
                ],
            },
            "bands": {
                "B2": {"min": 190.0, "max": 1450.0, "mean": 488.5, "median": 435.0, "std_dev": 128.5},
                "B3": {"min": 245.0, "max": 1690.0, "mean": 615.2, "median": 580.0, "std_dev": 145.0},
                "B4": {"min": 200.0, "max": 1870.0, "mean": 465.0, "median": 405.0, "std_dev": 170.1},
                "B8": {"min": 280.0, "max": 3590.0, "mean": 2280.0, "median": 2430.0, "std_dev": 580.0},
                "B11": {"min": 218.0, "max": 2460.0, "mean": 1140.0, "median": 1070.0, "std_dev": 315.0},
                "B12": {"min": 158.0, "max": 1990.0, "mean": 655.0, "median": 595.0, "std_dev": 220.0},
            },
            "indices": {
                "NDVI": {"min": -0.30, "max": 0.82, "mean": 0.62, "median": 0.68, "std_dev": 0.21},
                "NDWI": {"min": -0.76, "max": 0.66, "mean": -0.32, "median": -0.38, "std_dev": 0.27},
            },
            "processing": {
                "collection_id": "COPERNICUS/S2_SR_HARMONIZED",
                "start_date": "2020-01-01",
                "end_date": "2020-03-31",
                "image_count": 10,
                "cloud_threshold": 30,
                "composite_method": "median",
                "bands": ["B2", "B3", "B4", "B8", "B11", "B12"],
                "indices": ["NDVI", "NDWI"],
                "resolution_meters": 20,
            },
        },
    },
}
