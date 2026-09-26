# Confidence & Data Quality Methodology
**MangroveLens — Phase 7**

---

## 1. Multi-Component Quality Matrix

To maintain scientific integrity, the platform does NOT collapse disparate uncertainties into a single pseudo-scientific accuracy percentage. Instead, it exposes independent, component-level quality descriptors.

| Component | Metric / Proxy | Qualitative Status | Deterministic Rule / Basis |
| :--- | :---: | :---: | :--- |
| **Classification Confidence** | Mean $\max(P_{\text{RF}})$ | `high` / `medium` / `low` / `insufficient` | $\ge 0.85 \to$ High, $0.70\text{--}0.849 \to$ Medium, $0.50\text{--}0.699 \to$ Low, $< 0.50 \to$ Insufficient |
| **Change Detection Confidence** | $\min(\text{conf}_{2020}, \text{conf}_{2025})$ | `high` / `medium` / `low` | Dual-temporal minimum transition confidence |
| **Carbon Methodology Confidence** | Accounting Tier | `indicative` | IPCC 2013 Wetlands Supplement Tier-1 literature density factor ($283.1\text{ Mg C/ha}$) |
| **Factor Evidence Quality** | Factor Variance | `medium` | Regional literature factors with $\pm18\%$ to $\pm25\%$ empirical variance |
| **Spatial Data Quality** | Surface Reflectance | `high` | Sentinel-2 Level-2A BOA $20\text{m}$ resampled pixels with SCL cloud/shadow filtering |
| **Temporal Consistency** | Baseline Comparison | `high` | Standardized 5-year dry-season comparison ($2020 \leftrightarrow 2025$) |
| **Data Lineage Status** | Runtime Source | `real` / `demo` | Distinguishes live GEE satellite pipeline from deterministic demo fallback |

---

## 2. Decoupling Classification Confidence from Carbon Uncertainty

- **Random Forest Classification Confidence**: Represents the statistical probability that a given pixel's optical multi-spectral reflectance signature matches the trained land-cover class (Mangrove vs Water vs Aquaculture).
- **Carbon Factor Uncertainty**: Represents allometric biomass and soil carbon density variability across mangrove forest types, tidal zones, and sediment depths.
- **Rule**: Random Forest confidence is **never** presented as carbon estimation confidence.

---

## 3. Composite System Quality Indicator

For dashboard health monitoring, the platform computes a deterministic **System Quality Indicator**:
$$\text{Score} = (0.40 \times \text{ClassConf}) + (0.40 \times \text{ChangeConf}) + (0.20 \times \text{DataCompleteness})$$

> [!NOTE]
> The composite score is explicitly documented in report metadata as a **software pipeline health indicator**, NOT a certified scientific ecosystem measurement.

---

## 4. Field Verification Prioritization

Field surveys are prioritized using deterministic decision rules:
1. **High Priority**: Gross mangrove loss $\ge 5.0\text{ ha}$ OR classification confidence $< 0.70$.
2. **Medium Priority**: Localized canopy retreat ($0.5\text{--}5.0\text{ ha}$) OR pioneer expansion ($\ge 10.0\text{ ha}$) OR unverified demo data.
3. **Routine Monitoring**: Stable canopy with minimal loss ($< 0.5\text{ ha}$) and high classification confidence ($\ge 0.85$).

*Disclaimer*: Field verification priority is a survey planning flag, NOT proof of illegal logging, encroachment, or embankment failure.
