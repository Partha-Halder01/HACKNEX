"""Geospatial Service layer with GEE execution, MongoDB persistence, and 3-tier fallback."""
import logging
from typing import Any, Dict, Optional

from ..core.config import settings
from ..db.mongodb import get_database
from ..data.demo_data import DEMO_GEOSPATIAL_OBSERVATIONS
from ..geospatial.aoi import load_pilot_aoi, convert_to_ee_geometry, extract_geometry
from ..geospatial.gee_client import initialize_gee, get_gee_status
from ..geospatial.indices import INDICES_METADATA
from ..geospatial.sentinel2 import (
    get_seasonal_date_range,
    build_sentinel_composite,
    extract_zonal_statistics,
    SentinelProcessingError,
)
from ..schemas.geospatial import (
    GeospatialStatusResponse,
    SentinelObservation,
    GeospatialIndicesResponse,
    IndexStatisticsDetail,
    GeospatialPreviewResponse,
    GeoJSONFeatureCollection,
    GeoJSONFeature,
    GeoStatistics,
    ProcessingMetadata,
    SeasonalWindow,
)
from ..schemas.common import GeoJsonGeometry

logger = logging.getLogger("sundarban.services.geospatial")


async def get_geospatial_status_service() -> GeospatialStatusResponse:
    """Check Google Earth Engine connection status and configuration."""
    status_raw = get_gee_status()
    seasonal_dict = status_raw.pop("seasonalWindow", {})

    return GeospatialStatusResponse(
        enabled=status_raw["enabled"],
        initialized=status_raw["initialized"],
        status_code=status_raw["statusCode"],
        message=status_raw["message"],
        project_id=status_raw["projectId"],
        collection_id=status_raw["collectionId"],
        aoi_source=status_raw["aoiSource"],
        cloud_threshold_percent=status_raw["cloudThresholdPercent"],
        seasonal_window=SeasonalWindow(
            start_month=seasonal_dict.get("startMonth", settings.SENTINEL_START_MONTH),
            start_day=seasonal_dict.get("startDay", settings.SENTINEL_START_DAY),
            end_month=seasonal_dict.get("endMonth", settings.SENTINEL_END_MONTH),
            end_day=seasonal_dict.get("endDay", settings.SENTINEL_END_DAY),
        ),
    )


async def get_sentinel_observation_service(
    village_id: str = "gosaba",
    year: int = 2025,
) -> SentinelObservation:
    """Retrieve structured Sentinel-2 observation via GEE or high-fidelity fallback.

    Tier 1: MongoDB cache / live GEE processing (if GEE configured & enabled)
    Tier 2: Backend high-fidelity demo fallback with clear demo_fallback labeling
    """
    clean_id = village_id.lower().strip()
    clean_id = "satjelia" if "sat" in clean_id else "gosaba"

    # 1. Check MongoDB for existing processed observation
    db = get_database()
    if db is not None:
        try:
            cached = await db.geospatial_observations.find_one(
                {"village_id": clean_id, "year": year},
                {"_id": 0}
            )
            if cached:
                logger.info(f"[Geospatial Service] Retrieved cached observation for {clean_id} ({year}) from MongoDB.")
                return SentinelObservation(**cached)
        except Exception as e:
            logger.warning(f"[Geospatial Service] MongoDB lookup failed: {e}")

    # 2. If GEE is enabled, attempt real processing
    if settings.GEE_ENABLED:
        is_init, status_code, err_msg = initialize_gee()
        if is_init:
            try:
                aoi_geojson = load_pilot_aoi()
                ee_geom = convert_to_ee_geometry(aoi_geojson)
                start_date, end_date = get_seasonal_date_range(year)

                composite_img, proc_meta = build_sentinel_composite(
                    geometry=ee_geom,
                    start_date=start_date,
                    end_date=end_date,
                    cloud_threshold=settings.SENTINEL_CLOUD_PERCENT,
                    collection_id=settings.SENTINEL_COLLECTION,
                )

                zonal_stats = extract_zonal_statistics(
                    image=composite_img,
                    geometry=ee_geom,
                    scale=20,
                )

                raw_geom = extract_geometry(aoi_geojson)
                village_name = "Satjelia" if clean_id == "satjelia" else "Gosaba"

                obs_data = {
                    "village_id": clean_id,
                    "village_name": village_name,
                    "year": year,
                    "source": "Sentinel-2",
                    "platform": "Google Earth Engine",
                    "collection": settings.SENTINEL_COLLECTION,
                    "data_source": "sentinel2_gee",
                    "is_real_data": True,
                    "geometry": raw_geom,
                    "bands": zonal_stats["bands"],
                    "indices": zonal_stats["indices"],
                    "processing": proc_meta,
                }

                # Save observation to MongoDB
                if db is not None:
                    try:
                        await db.geospatial_observations.update_one(
                            {"village_id": clean_id, "year": year},
                            {"$set": obs_data},
                            upsert=True,
                        )
                        logger.info(f"[Geospatial Service] Stored real GEE observation in MongoDB for {clean_id} ({year}).")
                    except Exception as e:
                        logger.warning(f"[Geospatial Service] Failed to persist observation to MongoDB: {e}")

                return SentinelObservation(**obs_data)

            except SentinelProcessingError as spe:
                logger.error(f"[Geospatial Service] Sentinel processing error [{spe.code}]: {spe.message}")
                raise
            except Exception as e:
                logger.error(f"[Geospatial Service] Unexpected GEE execution error: {e}")
                raise

    # 3. Graceful High-Fidelity Demo Fallback (Tier 2)
    demo_village_data = DEMO_GEOSPATIAL_OBSERVATIONS.get(clean_id, DEMO_GEOSPATIAL_OBSERVATIONS["gosaba"])
    fallback_doc = demo_village_data.get(year, demo_village_data.get(2025))

    if not fallback_doc:
        # Create synthesized fallback for year
        base = demo_village_data.get(2025, DEMO_GEOSPATIAL_OBSERVATIONS["gosaba"][2025])
        fallback_doc = {**base, "year": year, "village_id": clean_id}

    return SentinelObservation(**fallback_doc)


async def get_geospatial_indices_service(
    village_id: str = "gosaba",
    year: int = 2025,
) -> GeospatialIndicesResponse:
    """Extract and format NDVI and NDWI index analytics with scientific metadata."""
    obs = await get_sentinel_observation_service(village_id=village_id, year=year)

    ndvi_stats = obs.indices.get("NDVI", GeoStatistics(min=0.0, max=0.0, mean=0.0, median=0.0, std_dev=0.0))
    ndwi_stats = obs.indices.get("NDWI", GeoStatistics(min=0.0, max=0.0, mean=0.0, median=0.0, std_dev=0.0))

    ndvi_meta = INDICES_METADATA["NDVI"]
    ndwi_meta = INDICES_METADATA["NDWI"]

    return GeospatialIndicesResponse(
        village_id=obs.village_id,
        village_name=obs.village_name,
        year=obs.year,
        data_source=obs.data_source,
        is_real_data=obs.is_real_data,
        ndvi=IndexStatisticsDetail(
            name=ndvi_meta["name"],
            formula=ndvi_meta["formula"],
            bands=ndvi_meta["bands"],
            range=ndvi_meta["range"],
            statistics=ndvi_stats,
            interpretation=ndvi_meta["interpretation"],
            scientific_disclaimer=ndvi_meta["scientific_disclaimer"],
        ),
        ndwi=IndexStatisticsDetail(
            name=ndwi_meta["name"],
            formula=ndwi_meta["formula"],
            bands=ndwi_meta["bands"],
            range=ndwi_meta["range"],
            statistics=ndwi_stats,
            interpretation=ndwi_meta["interpretation"],
            scientific_disclaimer=ndwi_meta["scientific_disclaimer"],
        ),
    )


async def get_geospatial_preview_service(
    village_id: str = "gosaba",
    year: int = 2025,
) -> GeospatialPreviewResponse:
    """Package observation as a map-ready GeoJSON FeatureCollection."""
    obs = await get_sentinel_observation_service(village_id=village_id, year=year)

    feature = GeoJSONFeature(
        id=f"feat_{obs.village_id}_{obs.year}",
        properties={
            "villageId": obs.village_id,
            "villageName": obs.village_name,
            "year": obs.year,
            "source": obs.source,
            "platform": obs.platform,
            "collection": obs.collection,
            "dataSource": obs.data_source,
            "isRealData": obs.is_real_data,
            "ndviMean": obs.indices.get("NDVI", GeoStatistics(min=0, max=0, mean=0, median=0, std_dev=0)).mean,
            "ndwiMean": obs.indices.get("NDWI", GeoStatistics(min=0, max=0, mean=0, median=0, std_dev=0)).mean,
            "imageCount": obs.processing.image_count,
            "cloudThreshold": obs.processing.cloud_threshold,
            "compositeMethod": obs.processing.composite_method,
            "startDate": obs.processing.start_date,
            "endDate": obs.processing.end_date,
        },
        geometry=obs.geometry,
    )

    collection = GeoJSONFeatureCollection(
        name=f"Sentinel-2 Observation Preview - {obs.village_name} ({obs.year})",
        metadata={
            "villageId": obs.village_id,
            "year": obs.year,
            "dataSource": obs.data_source,
            "isRealData": obs.is_real_data,
        },
        features=[feature],
    )

    return GeospatialPreviewResponse(
        village_id=obs.village_id,
        village_name=obs.village_name,
        year=obs.year,
        data_source=obs.data_source,
        is_real_data=obs.is_real_data,
        geojson=collection,
    )
