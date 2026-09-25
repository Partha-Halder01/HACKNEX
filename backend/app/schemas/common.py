"""Common base models and generic envelopes."""
from typing import Generic, TypeVar, Optional, Any, Dict, List, Union
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """Base Pydantic model with automatic camelCase serialization for frontend contract parity."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ApiResponse(CamelModel, Generic[T]):
    """Standard generic API response wrapper."""
    success: bool = True
    data: T
    message: Optional[str] = None
    timestamp: Optional[str] = None


class ApiErrorDetail(CamelModel):
    """Structured error payload."""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ApiErrorResponse(CamelModel):
    """Standard error response structure."""
    success: bool = False
    error: ApiErrorDetail


class GeoJsonGeometry(CamelModel):
    """Lightweight GeoJSON polygon representation."""
    type: str  # "Polygon" | "MultiPolygon"
    coordinates: Union[List[List[List[float]]], List[List[List[List[float]]]]]


class HealthResponse(CamelModel):
    """Health check status model."""
    status: str = "ok"
    service: str = "sundarban-blue-carbon-api"
    version: str = "0.1.0"
