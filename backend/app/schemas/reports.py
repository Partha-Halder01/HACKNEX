"""Bilingual Village Report schemas."""
from typing import List, Optional, Literal
from .common import CamelModel

ReportLanguage = Literal["bn", "en"]


class ReportObservation(CamelModel):
    id: str
    title: str
    detail: str
    severity: Optional[Literal["info", "positive", "warning"]] = None


class RecommendedAction(CamelModel):
    id: str
    title: str
    description: str
    priority: Literal["high", "medium", "low"]
    stakeholder: Literal["community", "forest_dept", "panchayat", "researcher"]


class LandCoverFindings(CamelModel):
    total_area_ha: float
    mangrove_area_ha: float
    mangrove_percentage: float


class ChangeFindings(CamelModel):
    gain_ha: float
    loss_ha: float
    net_change_ha: float


class CarbonFindings(CamelModel):
    estimated_tons: float
    factor_used: float = 283.1
    estimated_carbon_mg_c: Optional[float] = None
    estimated_co2e_mg: Optional[float] = None
    carbon_density_mg_c_per_ha: float = 283.1


class VillageReport(CamelModel):
    id: str
    village_id: str
    village_name: str
    bengali_village_name: str
    region: str
    report_date: str
    period: str
    language: ReportLanguage
    summary_text: str
    land_cover_findings: LandCoverFindings
    change_findings: ChangeFindings
    carbon_estimate: CarbonFindings
    key_observations: List[ReportObservation]
    recommended_actions: List[RecommendedAction]
