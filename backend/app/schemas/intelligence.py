"""Pydantic schemas for Phase 7 AI Environmental Intelligence, Confidence, and Decision Support."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import Field
from .common import CamelModel

ConfidenceLevel = Literal["high", "medium", "low", "insufficient", "indicative"]
VerificationPriorityLevel = Literal["high", "medium", "low", "routine"]
LanguageCode = Literal["bn", "en"]


class EvidenceItem(CamelModel):
    """Structured atomic evidence element derived deterministically from Phase 3–6 pipelines."""
    evidence_id: str = Field(alias="evidenceId")
    category: str  # "land_cover", "change_detection", "carbon", "uncertainty", "geospatial", "methodology", "data_quality"
    source: str    # "sentinel2_gee", "random_forest", "post_classification_matrix", "ipcc_tier1_registry"
    metric: str
    value: Any
    unit: Optional[str] = None
    time_period: str = Field(alias="timePeriod")
    year: Optional[int] = None
    data_source: str = Field(alias="dataSource")
    is_real_data: bool = Field(alias="isRealData")
    methodology: str
    confidence: Optional[float] = None
    limitations: Optional[str] = None


class DeterministicFact(CamelModel):
    """Immutable baseline fact computed by backend rules before any LLM interpretation."""
    fact_id: str = Field(alias="factId")
    category: str
    statement_en: str = Field(alias="statementEn")
    statement_bn: str = Field(alias="statementBn")
    evidence_id: str = Field(alias="evidenceId")


class ConfidenceScoreDetail(CamelModel):
    """Detailed metadata for a single component-level confidence indicator."""
    value: Optional[float] = None
    status: ConfidenceLevel
    source: str
    description: str
    reason: Optional[str] = None


class DataSourceStatusDetail(CamelModel):
    """Transparency descriptor indicating real vs demo/fallback data lineage."""
    status: str  # "demo_fallback", "real_gee_pipeline", "mixed_real_spatial_literature_factors"
    is_real_data: bool = Field(alias="isRealData")
    header_notice_en: str = Field(alias="headerNoticeEn")
    header_notice_bn: str = Field(alias="headerNoticeBn")


class SystemQualityIndicatorDetail(CamelModel):
    """Composite software quality indicator (explicitly documented as software quality, not scientific truth)."""
    score: float
    grade: str  # "A", "B", "C", "D"
    status: str
    formula_note: str = Field(alias="formulaNote")


class ComponentConfidence(CamelModel):
    """Multi-component confidence and data quality matrix."""
    classification_confidence: ConfidenceScoreDetail = Field(alias="classificationConfidence")
    change_detection_confidence: ConfidenceScoreDetail = Field(alias="changeDetectionConfidence")
    carbon_methodology_confidence: ConfidenceScoreDetail = Field(alias="carbonMethodologyConfidence")
    factor_evidence_quality: ConfidenceScoreDetail = Field(alias="factorEvidenceQuality")
    spatial_data_quality: ConfidenceScoreDetail = Field(alias="spatialDataQuality")
    temporal_consistency: ConfidenceScoreDetail = Field(alias="temporalConsistency")
    data_source_status: DataSourceStatusDetail = Field(alias="dataSourceStatus")
    system_quality_indicator: SystemQualityIndicatorDetail = Field(alias="systemQualityIndicator")


class FieldVerificationPriority(CamelModel):
    """Deterministic field survey prioritization flags."""
    priority: VerificationPriorityLevel
    priority_bn: str = Field(alias="priorityBn")
    reason_codes: List[str] = Field(alias="reasonCodes")
    recommended_verification: List[str] = Field(alias="recommendedVerification")
    recommended_verification_bn: List[str] = Field(alias="recommendedVerificationBn")
    disclaimer: str


class ManagementConsideration(CamelModel):
    """Evidence-grounded, non-prescriptive stakeholder considerations."""
    id: str
    title: str
    title_bn: str = Field(alias="titleBn")
    description: str
    description_bn: str = Field(alias="descriptionBn")
    priority: Literal["high", "medium", "low"]
    stakeholder: Literal["community", "forest_dept", "panchayat", "researcher"]
    evidence_references: List[str] = Field(alias="evidenceReferences")


class AIEnvironmentalInsights(CamelModel):
    """Structured AI or fallback interpretations grounded strictly in supplied evidence IDs."""
    executive_summary: str = Field(alias="executiveSummary")
    executive_summary_bn: Optional[str] = Field(default=None, alias="executiveSummaryBn")
    land_cover_summary: str = Field(alias="landCoverSummary")
    land_cover_summary_bn: Optional[str] = Field(default=None, alias="landCoverSummaryBn")
    change_summary: str = Field(alias="changeSummary")
    change_summary_bn: Optional[str] = Field(default=None, alias="changeSummaryBn")
    carbon_summary: str = Field(alias="carbonSummary")
    carbon_summary_bn: Optional[str] = Field(default=None, alias="carbonSummaryBn")
    uncertainty_summary: str = Field(alias="uncertaintySummary")
    uncertainty_summary_bn: Optional[str] = Field(default=None, alias="uncertaintySummaryBn")
    limitations: List[str]
    limitations_bn: Optional[List[str]] = Field(default=None, alias="limitationsBn")
    evidence_references: List[str] = Field(alias="evidenceReferences")


class AIMetadata(CamelModel):
    """Provenance metadata regarding LLM generation vs deterministic fallback."""
    ai_generated: bool = Field(alias="aiGenerated")
    ai_model: str = Field(alias="aiModel")
    ai_status: str = Field(alias="aiStatus")  # "success", "fallback", "disabled"
    generated_at: str = Field(alias="generatedAt")
    guardrail_validation: str = Field(alias="guardrailValidation")


class EnvironmentalIntelligenceResponse(CamelModel):
    """Unified Environmental Intelligence response model."""
    report_id: str = Field(alias="reportId")
    village_id: str = Field(alias="villageId")
    village_name: str = Field(alias="villageName")
    bengali_village_name: str = Field(alias="bengaliVillageName")
    region: str
    year: int
    from_year: int = Field(alias="fromYear")
    to_year: int = Field(alias="toYear")
    language: str
    generated_at: str = Field(alias="generatedAt")
    data_source_status: str = Field(alias="dataSourceStatus")
    is_real_data: bool = Field(alias="isRealData")
    methodology_version: str = Field(alias="methodologyVersion")
    report_version: str = Field(alias="reportVersion")
    insights: AIEnvironmentalInsights
    confidence: ComponentConfidence
    verification: FieldVerificationPriority
    management_considerations: List[ManagementConsideration] = Field(alias="managementConsiderations")
    deterministic_facts: List[DeterministicFact] = Field(alias="deterministicFacts")
    evidence_items: List[EvidenceItem] = Field(alias="evidenceItems")
    ai_metadata: AIMetadata = Field(alias="aiMetadata")
    disclaimer: str


class IntelligenceSummaryResponse(CamelModel):
    """High-level summary endpoint response."""
    village_id: str = Field(alias="villageId")
    village_name: str = Field(alias="villageName")
    year: int
    executive_summary: str = Field(alias="executiveSummary")
    executive_summary_bn: str = Field(alias="executiveSummaryBn")
    mangrove_area_ha: float = Field(alias="mangroveAreaHa")
    net_change_ha: float = Field(alias="netChangeHa")
    carbon_stock_mg_c: float = Field(alias="carbonStockMgC")
    system_quality_indicator: float = Field(alias="systemQualityIndicator")
    verification_priority: str = Field(alias="verificationPriority")
    is_real_data: bool = Field(alias="isRealData")
    data_source: str = Field(alias="dataSource")


class FieldVerificationResponse(CamelModel):
    """Dedicated field verification priorities response."""
    village_id: str = Field(alias="villageId")
    village_name: str = Field(alias="villageName")
    year: int
    verification: FieldVerificationPriority
    key_flags: List[str] = Field(alias="keyFlags")


class EvidenceListResponse(CamelModel):
    """Dedicated deterministic evidence audit endpoint response."""
    village_id: str = Field(alias="villageId")
    year: int
    evidence_count: int = Field(alias="evidenceCount")
    evidence_items: List[EvidenceItem] = Field(alias="evidenceItems")
