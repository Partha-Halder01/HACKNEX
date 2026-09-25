"""Evidence generation rules, forbidden claims patterns, and bilingual templates for Phase 7."""
import re
from typing import List, Dict, Any

# Standard Forbidden Claims / Guardrail Patterns
# Gemini or AI outputs must be rejected or flagged if they make unverified claims without evidence
FORBIDDEN_CLAIM_PATTERNS = [
    r"verified\s+carbon\s+credits?",
    r"guaranteed\s+(?:financial\s+)?revenue",
    r"exact\s+carbon\s+(?:measurement|stock)",
    r"satellite\s+directly\s+measured\s+carbon",
    r"satellite\s+measured\s+carbon",
    r"confirmed\s+(?:coastal\s+)?erosion\s+event",
    r"confirmed\s+(?:illegal\s+)?encroachment",
    r"confirmed\s+restoration\s+activity",
    r"guaranteed\s+atmospheric\s+removal",
    r"guaranteed\s+sequestration",
    r"tradable\s+credits?",
    r"certified\s+carbon\s+issuance",
]

# Prohibited Causal Overstatements in AI Text
PROHIBITED_CAUSAL_TERMS = [
    "definitely caused by erosion",
    "directly caused by aquaculture encroachment",
    "proven mangrove destruction",
    "guaranteed recovery rate",
]

# Standard System Disclaimers
STANDARD_DISCLAIMER_EN = (
    "These results are model-based environmental estimates derived from satellite/geospatial classification "
    "and literature-based carbon factors. They are intended for monitoring, screening, and research support "
    "and should not be interpreted as field-verified carbon measurements, certified carbon credits, or guaranteed financial returns."
)

STANDARD_DISCLAIMER_BN = (
    "এই ফলাফলগুলি স্যাটেলাইট/ভূ-স্থানিক শ্রেণিবিন্যাস এবং প্রকাশিত কার্বন ফ্যাক্টরের ভিত্তিতে তৈরি মডেল-ভিত্তিক "
    "পরিবেশগত অনুমান। এগুলি পর্যবেক্ষণ, প্রাথমিক যাচাই এবং গবেষণা সহায়তার জন্য ব্যবহারযোগ্য; মাঠ পর্যায়ে "
    "যাচাইকৃত কার্বন পরিমাপ, প্রত্যয়িত কার্বন ক্রেডিট বা নিশ্চিত আর্থিক আয় হিসেবে বিবেচনা করা যাবে না।"
)


def check_forbidden_claims(text: str) -> List[str]:
    """Scan text for prohibited claims or scientific hallucinations.

    Returns:
        List of matched forbidden patterns (empty if clean).
    """
    found = []
    for pattern in FORBIDDEN_CLAIM_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            found.append(pattern)
    return found
