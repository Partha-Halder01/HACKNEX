# AI Environmental Intelligence Architecture & Methodology
**Sundarban Blue Carbon — Phase 7**

---

## 1. Core Architectural Principle: Deterministic Data First, AI Second

The AI layer in Sundarban Blue Carbon operates strictly as an **interpretation and reporting assistant**, NOT as the source of numerical truth or direct measurement.

```
Phase 3–6 Structured Geospatial & ML Data
                 ↓
      Evidence Builder (`evidence.py`)
                 ↓
      Atomic Evidence Items (Unique Evidence IDs)
                 ↓
      Deterministic Baseline Facts (`evidence_rules.py`)
                 ↓
      Multi-Component Confidence Layer (`confidence.py`)
                 ↓
      Decision Support & Verification Flags (`recommendations.py`)
                 ↓
      Gemini Structured Interpretation (`prompts.py`)
                 ↓
      Guardrail & Evidence Reference Validation (`validator.py`)
                 ↓
      Deterministic Fallback Pipeline (`insights.py`)
                 ↓
      Bilingual Village Reports & ReportLab PDF (`reports.py`, `pdf.py`)
                 ↓
      FastAPI REST Gateway (`/api/intelligence/*`)
```

---

## 2. Evidence Registry & Traceability

Every piece of quantitative or analytical information generated across the platform is converted into an immutable, atomic **Evidence Item** tagged with a unique `evidenceId`.

### Evidence Categories:
- `land_cover`: Canopy coverage area, percentage, and 5-class distribution (Phase 4).
- `change_detection`: Gross gain, gross loss, net canopy delta, transition matrix entries (Phase 5).
- `carbon`: Stratified stocks (AGB, BGB, SOC 0–1m), stoichiometric CO2e conversion, stock delta, and transition dynamics (Phase 6).
- `uncertainty`: First-order Gaussian error propagation, confidence intervals, and margins of error (Phase 6).
- `geospatial`: Multi-spectral indices (NDVI, NDWI) and observation metadata (Phase 3).
- `methodology`: Accounting tier and standard provenance citations.
- `data_quality`: Model confidence proxies and data lineage flags.

### Example Evidence Item:
```json
{
  "evidenceId": "LC-2025-GOSABA-001",
  "category": "land_cover",
  "source": "random_forest_classification",
  "metric": "mangrove_area_ha",
  "value": 775.60,
  "unit": "ha",
  "timePeriod": "2025",
  "year": 2025,
  "dataSource": "demo_fallback",
  "isRealData": false,
  "methodology": "Random Forest 5-Class Sentinel-2 Composite Mapping",
  "confidence": 0.918,
  "limitations": "Optical canopy reflectance classification at 20m spatial resolution."
}
```

---

## 3. Gemini Role & System Guardrails

### System Instructions:
Gemini is constrained by strict prompt engineering and Pydantic schema validation:
1. **Interpret Only Provided Evidence**: Gemini is prohibited from inventing satellite observations, field observations, community records, or carbon factors.
2. **Deterministic Values**: Gemini does NOT recalculate numbers. All numeric claims must match the deterministic baseline facts.
3. **Traceability**: Every major analytical conclusion must explicitly cite valid `evidenceReferences` from the supplied registry.
4. **Causal Restraint**: Observed transitions (e.g. Mangrove → Water) are treated as spectral transitions. Causal attributions (e.g. cyclonic wave erosion vs tidal channel migration) require independent ground validation.
5. **No Carbon Market Claims**: Estimated carbon stocks and differences must NEVER be described as certified carbon offsets, tradable credits, or guaranteed revenue.

### Forbidden Claim Detection:
The validator rejects or flags strings containing prohibited assertions, including:
- `"verified carbon credits"`
- `"guaranteed revenue"`
- `"exact carbon measurement"`
- `"satellite directly measured carbon"`
- `"confirmed erosion event"`
- `"confirmed illegal encroachment"`
- `"guaranteed atmospheric removal"`

---

## 4. Fallback Architecture

If the Gemini API key is missing, network requests timeout, or LLM output fails JSON schema or evidence reference verification:
- The system automatically triggers the **Deterministic Rules Engine** (`generate_deterministic_fallback_insights`).
- The response returns a complete, scientifically accurate report in English or Bengali.
- Metadata is flagged with `aiGenerated: false`, `aiStatus: "fallback"`, ensuring 100% service uptime and verifiable auditability.
