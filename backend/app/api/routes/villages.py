"""Villages route."""
from typing import List
from fastapi import APIRouter
from ...schemas.monitoring import Village
from ...services.villages import get_villages_list

router = APIRouter(tags=["Villages"])


@router.get("/villages", response_model=List[Village])
async def read_villages() -> List[Village]:
    """Retrieve all monitored Sundarban pilot sectors and villages."""
    return await get_villages_list()
