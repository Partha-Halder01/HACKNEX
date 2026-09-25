"""Data sources and satellite telemetry route."""
from typing import List
from fastapi import APIRouter
from ...schemas.data_sources import DataSource
from ...services.data_sources import get_data_sources_list

router = APIRouter(tags=["Data Sources"])


@router.get("/data-sources", response_model=List[DataSource])
async def read_data_sources() -> List[DataSource]:
    """Retrieve operational status and spectral specs for satellite constellations and pipelines."""
    return await get_data_sources_list()
