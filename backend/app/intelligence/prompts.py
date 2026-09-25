"""Prompt templates and system instructions for Gemini AI environmental intelligence."""
import json
from typing import Any, Dict, List
from ..schemas.intelligence import EvidenceItem, DeterministicFact

SYSTEM_INSTRUCTION = """You are an evidence-grounded coastal environmental intelligence assistant specializing in the Sundarban deltaic mangrove ecosystem.

Your mission is to summarize and interpret the provided deterministic environmental evidence without inventing facts, statistics, measurements, causes, or regulatory claims.

CRITICAL SCIENTIFIC & LEGAL RULES:
1. Interpret ONLY the structured evidence supplied to you. Do NOT invent satellite observations, carbon factors, measurements, or community records.
2. All numerical values must match the supplied deterministic facts and evidence. Do not recalculate or alter numbers.
3. Satellite multi-spectral imaging is an optical classification proxy. Do NOT state that satellites directly measure soil or belowground carbon.
4. Carbon estimates are model-based and indicative. Do NOT describe carbon stocks or differences as 'certified carbon credits', 'tradable offsets', or 'guaranteed financial revenue'.
5. Land-cover transitions (e.g. Mangrove → Water or Mangrove → Aquaculture) are neutral spectral observations. Do NOT make unproven causal claims (such as claiming proven embankment failure or illegal encroachment) unless explicitly supported by field evidence.
6. When causal evidence is absent, explicitly state: 'Spectral transition observed; causal interpretation requires ground verification.'
7. Every major analytical finding MUST list the exact Evidence IDs it is grounded on in 'evidenceReferences'.
8. Output MUST strictly conform to the requested JSON format."""


def build_interpretation_prompt(
    village_name: str,
    bengali_village_name: str,
    year: int,
    from_year: int,
    to_year: int,
    evidence_items: List[EvidenceItem],
    deterministic_facts: List[DeterministicFact],
    language: str = "en",
) -> str:
    """Build a structured prompt containing all deterministic evidence and facts."""
    is_bn = language.lower() == "bn"

    evidence_summary = [
        {
            "evidenceId": e.evidence_id,
            "category": e.category,
            "metric": e.metric,
            "value": e.value,
            "unit": e.unit,
            "source": e.source,
            "limitations": e.limitations,
        }
        for e in evidence_items
    ]

    facts_summary = [
        {"factId": f.fact_id, "statement": f.statement_bn if is_bn else f.statement_en, "evidenceId": f.evidence_id}
        for f in deterministic_facts
    ]

    prompt = f"""
Analyze the following verified environmental facts and structured evidence for village '{village_name}' ({bengali_village_name}) in the Indian Sundarbans for observation period {from_year}–{to_year}:

Target Language: {"Bengali (বাংলা)" if is_bn else "English"}

DETERMINISTIC BASELINE FACTS:
{json.dumps(facts_summary, indent=2, ensure_ascii=False)}

STRUCTURED EVIDENCE REGISTRY:
{json.dumps(evidence_summary, indent=2, ensure_ascii=False)}

REQUIRED OUTPUT FORMAT:
Return a single JSON object with EXACTLY the following keys:
{{
  "executiveSummary": "2-3 concise sentences summarizing the canopy area, 5-year trend, and model-based carbon stock.",
  "landCoverSummary": "Interpretation of the 5-class distribution and canopy coverage proportion.",
  "changeSummary": "Interpretation of gross gain, gross loss, and net canopy change, emphasizing that transitions are spectral observations.",
  "carbonSummary": "Summary of stratified carbon pools (AGB, BGB, SOC) and indicative CO2e equivalence, explicitly clarifying that these are Tier-1 literature estimates.",
  "uncertaintySummary": "Explanation of the combined ±18.3% uncertainty range and how optical classifier confidence differs from carbon factor variance.",
  "limitations": [
    "List of 3-4 specific scientific limitations (e.g. optical resolution proxy, lack of in-situ sediment cores, tidal variation)."
  ],
  "evidenceReferences": [
    "List of all Evidence IDs used (e.g. 'LC-{year}-{village_name.upper()}-001', 'CD-{from_year}-{to_year}-{village_name.upper()}-001', etc.)"
  ]
}}

Ensure every Evidence ID referenced exists in the supplied evidence registry. Do not include markdown codeblocks or extraneous text outside the JSON object.
"""
    return prompt.strip()
