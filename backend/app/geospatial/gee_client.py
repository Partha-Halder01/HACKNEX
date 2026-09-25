"""Google Earth Engine (GEE) Client initialization and status diagnostics.

Provides safe Earth Engine initialization supporting both service account credentials
and standard user/project authentication, with clear error classification and zero credential leakage.
"""
import logging
import os
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("sundarban.geospatial.gee")

# Global initialization state
_gee_initialized: bool = False
_gee_status_code: str = "GEE_NOT_INITIALIZED"
_gee_error_message: Optional[str] = None
_gee_project_id: Optional[str] = None


def initialize_gee(force_reinit: bool = False) -> Tuple[bool, str, Optional[str]]:
    """Initialize Google Earth Engine safely without crashing application startup.

    Returns:
        (is_initialized, status_code, message)
    """
    global _gee_initialized, _gee_status_code, _gee_error_message, _gee_project_id
    from app.core.config import settings

    if _gee_initialized and not force_reinit:
        return True, _gee_status_code, _gee_error_message

    if not settings.GEE_ENABLED:
        _gee_initialized = False
        _gee_status_code = "GEE_DISABLED"
        _gee_error_message = (
            "Google Earth Engine integration is disabled (GEE_ENABLED=false). "
            "Using high-fidelity offline demonstration fallback."
        )
        logger.info(f"[GEE] {_gee_error_message}")
        return False, _gee_status_code, _gee_error_message

    try:
        import ee
    except ImportError:
        _gee_initialized = False
        _gee_status_code = "GEE_LIBRARY_MISSING"
        _gee_error_message = "earthengine-api Python package is not installed."
        logger.error(f"[GEE] {_gee_error_message}")
        return False, _gee_status_code, _gee_error_message

    project_id = settings.GEE_PROJECT_ID
    service_account = settings.GEE_SERVICE_ACCOUNT
    key_file = settings.GEE_PRIVATE_KEY_FILE
    if key_file and not os.path.isabs(key_file):
        # Relative paths are relative to backend/, like the .env that sets them.
        from app.core.config import BACKEND_DIR
        key_file = str(BACKEND_DIR / key_file)
    key_json = settings.GEE_PRIVATE_KEY_JSON

    try:
        if service_account and key_json:
            # Key material passed inline via env var (hosted deployments).
            logger.info(f"[GEE] Initializing with service account (inline key): {service_account}")
            credentials = ee.ServiceAccountCredentials(service_account, key_data=key_json)
            ee.Initialize(credentials=credentials, project=project_id)
        elif service_account and key_file:
            if not os.path.exists(key_file):
                _gee_initialized = False
                _gee_status_code = "GEE_KEY_FILE_NOT_FOUND"
                _gee_error_message = f"Service account key file not found at configured path."
                logger.warning(f"[GEE] {_gee_error_message}")
                return False, _gee_status_code, _gee_error_message

            logger.info(f"[GEE] Initializing with service account: {service_account}")
            credentials = ee.ServiceAccountCredentials(service_account, key_file)
            ee.Initialize(credentials=credentials, project=project_id)
        else:
            # Attempt standard user / local project authentication
            logger.info(f"[GEE] Initializing with project ID: {project_id or 'default'}")
            if project_id:
                ee.Initialize(project=project_id)
            else:
                ee.Initialize()

        _gee_initialized = True
        _gee_status_code = "GEE_INITIALIZED"
        _gee_project_id = project_id
        _gee_error_message = None
        logger.info("[GEE] Successfully initialized Google Earth Engine connection.")
        return True, _gee_status_code, None

    except Exception as e:
        _gee_initialized = False
        err_str = str(e)
        if "not configured" in err_str.lower() or "credentials" in err_str.lower():
            _gee_status_code = "GEE_AUTHENTICATION_FAILED"
            _gee_error_message = (
                "Earth Engine authentication failed. Run 'earthengine authenticate' or "
                "configure GEE_SERVICE_ACCOUNT and GEE_PRIVATE_KEY_FILE in .env."
            )
        else:
            _gee_status_code = "GEE_NOT_CONFIGURED"
            _gee_error_message = f"GEE initialization failed: {type(e).__name__}"

        logger.warning(f"[GEE] {err_str}")
        return False, _gee_status_code, _gee_error_message


def get_gee_status() -> Dict[str, Any]:
    """Retrieve current Google Earth Engine status metadata for API diagnostics."""
    global _gee_initialized, _gee_status_code, _gee_error_message, _gee_project_id
    from app.core.config import settings

    return {
        "enabled": settings.GEE_ENABLED,
        "initialized": _gee_initialized,
        "statusCode": _gee_status_code,
        "message": _gee_error_message or (
            "Google Earth Engine is active and connected."
            if _gee_initialized
            else "Google Earth Engine is offline/uninitialized."
        ),
        "projectId": _gee_project_id or settings.GEE_PROJECT_ID,
        "collectionId": settings.SENTINEL_COLLECTION,
        "aoiSource": settings.SUNDARBAN_AOI_SOURCE,
        "cloudThresholdPercent": settings.SENTINEL_CLOUD_PERCENT,
        "seasonalWindow": {
            "startMonth": settings.SENTINEL_START_MONTH,
            "startDay": settings.SENTINEL_START_DAY,
            "endMonth": settings.SENTINEL_END_MONTH,
            "endDay": settings.SENTINEL_END_DAY,
        },
    }
