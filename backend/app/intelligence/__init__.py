"""Phase 7 AI Environmental Intelligence, Confidence, and Decision Support Module."""
from .evidence import build_environmental_evidence
from .confidence import build_component_confidence_matrix, evaluate_confidence_status
from .recommendations import evaluate_field_verification_priority, generate_management_considerations
from .insights import generate_environmental_insights, generate_deterministic_fallback_insights
from .validator import validate_ai_insights
from .prompts import SYSTEM_INSTRUCTION, build_interpretation_prompt
from .schemas import (
    EvidenceItem,
    DeterministicFact,
    ConfidenceScoreDetail,
    DataSourceStatusDetail,
    SystemQualityIndicatorDetail,
    ComponentConfidence,
    FieldVerificationPriority,
    ManagementConsideration,
    AIEnvironmentalInsights,
    AIMetadata,
    EnvironmentalIntelligenceResponse,
    IntelligenceSummaryResponse,
    FieldVerificationResponse,
    EvidenceListResponse,
)

__all__ = [
    "build_environmental_evidence",
    "build_component_confidence_matrix",
    "evaluate_confidence_status",
    "evaluate_field_verification_priority",
    "generate_management_considerations",
    "generate_environmental_insights",
    "generate_deterministic_fallback_insights",
    "validate_ai_insights",
    "SYSTEM_INSTRUCTION",
    "build_interpretation_prompt",
    "EvidenceItem",
    "DeterministicFact",
    "ConfidenceScoreDetail",
    "DataSourceStatusDetail",
    "SystemQualityIndicatorDetail",
    "ComponentConfidence",
    "FieldVerificationPriority",
    "ManagementConsideration",
    "AIEnvironmentalInsights",
    "AIMetadata",
    "EnvironmentalIntelligenceResponse",
    "IntelligenceSummaryResponse",
    "FieldVerificationResponse",
    "EvidenceListResponse",
]
