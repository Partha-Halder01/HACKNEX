"""Blue carbon estimation, pools, change, uncertainty, and methodology schemas (Phase 6)."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import Field
from .common import CamelModel

CarbonUnit = Literal["tCO2e", "tCO2e/ha", "Mg C/ha", "Mg C / ha", "Mg CO2e", "Mg C"]

MethodologyTier = Literal["Tier 1", "Tier 2", "Tier 3", "Tier 1 / indicative"]


class CarbonFactor(CamelModel):
    """Single registered carbon factor metadata."""
    factor_id: Optional[str] = None
    id: Optional[str] = None  # Backward compatibility alias
    name: Optional[str] = None
    pool: Optional[str] = None
    pool_name: Optional[str] = None
    factor_value: float
    unit: str
    description: Optional[str] = None
    source: Optional[str] = None
    source_citation: Optional[str] = None  # Backward compatibility alias
    source_url: Optional[str] = None
    source_year: Optional[int] = None
    tier: Optional[str] = None
    geographic_scope: Optional[str] = None
    applicability: Optional[str] = None
    uncertainty_pct: Optional[float] = None
    verified: bool = True
    status: str = "active_indicative"


class CarbonPoolDetail(CamelModel):
    """Individual carbon pool stock and stratification record."""
    pool_id: str
    pool_name: str
    factor_value: float
    factor_unit: str
    carbon_mg_c: float
    co2e_equivalent_mg: float = Field(alias="co2eEquivalentMg")
    percentage_of_total: float
    factor_source: str
    tier: str
    uncertainty_pct: float


class ExcludedPoolDetail(CamelModel):
    """Details on why an optional carbon pool was excluded."""
    pool_id: str
    pool_name: str
    reason_for_exclusion: str


class CarbonUncertainty(CamelModel):
    """Uncertainty ranges and confidence intervals."""
    min_estimate: Optional[float] = None
    max_estimate: Optional[float] = None
    confidence_level: float = 85.0  # percentage
    margin_of_error: float = 12.0   # ±% margin of error
    status: str = "partial"
    combined_relative_uncertainty_pct: Optional[float] = None
    margin_of_error_mg_c: Optional[float] = None
    lower_bound_mg_c: Optional[float] = None
    upper_bound_mg_c: Optional[float] = None
    carbon_range: Optional[List[float]] = None
    area_uncertainty_pct: Optional[float] = None
    factor_uncertainty_pct: Optional[float] = None
    classification_confidence: Optional[float] = None
    methodology_note: Optional[str] = None


class CarbonMethodology(CamelModel):
    """Methodological provenance and tier information."""
    name: str = "IPCC 2013 Coastal Wetlands / Blue Carbon Initiative Model"
    version: str = "v1.5-2025"
    tier: str = "Tier 1 / indicative"
    description: str = (
        "Above-ground biomass, below-ground biomass & soil organic carbon stock estimation "
        "using multi-spectral Sentinel-2 canopy mapping combined with IPCC Tier-1 stock density factors."
    )
    disclaimer: str = (
        "Model-based indicative estimate for regional conservation planning. "
        "Not certified carbon credit issuance under Verra (VCS) or Plan Vivo standards."
    )


class CarbonValuation(CamelModel):
    """Indicative voluntary carbon market valuation."""
    status: str = "indicative"
    co2e_metric_tons: float = Field(alias="co2eMetricTons")
    reference_price: float
    currency: str = "USD"
    price_source: str
    price_date: str
    indicative_value: float = Field(alias="indicativeValue")
    disclaimer: str


class CarbonEstimate(CamelModel):
    """Core Blue Carbon stock estimate response supporting full backward compatibility."""
    village_id: str
    village_name: Optional[str] = None
    year: int
    mangrove_area_ha: float
    scientific_factor: float = 14.8  # Legacy summary factor
    factor_unit: CarbonUnit = "tCO2e/ha"
    total_carbon_tons: float  # Legacy field (tC or tCO2e depending on consumer)
    carbon_stock_mg_c: Optional[float] = None
    co2e_equivalent_mg: Optional[float] = Field(default=None, alias="co2eEquivalentMg")
    carbon_range: List[float] = []  # [min, max]
    uncertainty: CarbonUncertainty
    methodology: CarbonMethodology
    indicative_note: str = "Model-based indicative estimate. Not certified carbon credit issuance."
    is_indicative: bool = True
    pools: Optional[Dict[str, CarbonPoolDetail]] = None
    included_pools: Optional[List[str]] = None
    excluded_pools: Optional[List[ExcludedPoolDetail]] = None
    valuation: Optional[CarbonValuation] = None
    data_source: Literal["random_forest_gee + literature_factor", "demo_fallback"] = "demo_fallback"
    is_real_data: bool = False
    estimate_status: str = "indicative"


# Alias for explicit naming
CarbonResponse = CarbonEstimate


class CarbonPoolsResponse(CamelModel):
    """Dedicated carbon pools stratification response."""
    village_id: str
    village_name: str
    year: int
    mangrove_area_ha: float
    total_carbon_mg_c: float
    total_co2e_mg: float = Field(alias="totalCo2eMg")
    total_density_mg_c_per_ha: float
    pools: Dict[str, CarbonPoolDetail]
    included_pools: List[str]
    excluded_pools: List[ExcludedPoolDetail]
    data_source: str = "demo_fallback"
    is_real_data: bool = False


class CarbonChangeResponse(CamelModel):
    """Multi-temporal carbon stock change report (2020 vs 2025)."""
    village_id: str
    village_name: str
    from_year: int
    to_year: int
    number_of_years: int
    baseline_mangrove_ha: float
    comparison_mangrove_ha: float
    carbon_stock_2020_mg_c: float
    co2e_stock_2020_mg: float = Field(alias="co2eStock2020Mg")
    carbon_stock_2025_mg_c: float
    co2e_stock_2025_mg: float = Field(alias="co2eStock2025Mg")
    carbon_stock_change_mg_c: float
    co2e_change_mg_co2e: float = Field(alias="co2eChangeMgCO2e")
    percent_carbon_change: Optional[float] = None
    gross_carbon_loss_mg_c: float
    gross_co2e_loss_mg_co2e: float = Field(alias="grossCo2eLossMgCO2e")
    gross_carbon_gain_mg_c: float
    gross_co2e_gain_mg_co2e: float = Field(alias="grossCo2eGainMgCO2e")
    annualized_stock_change_mg_c: float
    annualized_co2e_change_mg_co2e: float = Field(alias="annualizedCo2eChangeMgCO2e")
    total_density_mg_c_per_ha: float
    baseline_pools: Dict[str, Any]
    comparison_pools: Dict[str, Any]
    uncertainty: CarbonUncertainty
    methodology: CarbonMethodology
    data_source: str = "demo_fallback"
    is_real_data: bool = False
    accounting_notice: str


class PrimaryReferenceDetail(CamelModel):
    """Reference literature entry."""
    title: str
    authors: str
    year: int
    url: str
    organization: Optional[str] = None
    journal: Optional[str] = None


class CarbonMethodologyResponse(CamelModel):
    """Comprehensive methodology documentation endpoint response."""
    methodology_name: str
    methodology_version: str
    methodology_tier: str
    description: str
    primary_references: List[PrimaryReferenceDetail]
    carbon_pools: List[Dict[str, str]]
    registered_factors: List[Dict[str, Any]]
    molecular_conversion_factor: str
    assumptions: List[str]
    limitations: List[str]
    carbon_credit_disclaimer: str


class CarbonUncertaintyResponse(CamelModel):
    """Dedicated uncertainty endpoint response."""
    village_id: str
    year: int
    mangrove_area_ha: float
    carbon_stock_mg_c: float
    uncertainty: CarbonUncertainty
    classification_confidence: Optional[float] = None
    uncertainty_status: str
