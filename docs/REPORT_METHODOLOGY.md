# Village Report & PDF Generation Methodology
**MangroveLens — Phase 7**

---

## 1. Bilingual Report Generation Pipeline

The report generation pipeline produces evidence-grounded reports in both **Bengali (`lang=bn`)** and **English (`lang=en`)**.

```
Request: GET /api/villages/{id}/reports?lang=bn&use_gemini=false
                           ↓
     Load Village Metadata (Gosaba / Satjelia)
                           ↓
     Phase 3–6 Pipelines (Observations, RF LC, Change, Carbon)
                           ↓
     Evidence Builder & Deterministic Fact Generator
                           ↓
     Confidence Matrix & Decision Support Evaluator
                           ↓
     AI Insights / Fallback Generator (English / Bengali)
                           ↓
     Format into VillageReport Pydantic Schema
                           ↓
     Render Jinja2 HTML Template / ReportLab PDF
                           ↓
     Deliver via REST Gateway & Stream Attachment
```

---

## 2. Bengali Localization Principles

1. **Natural Terminology**: Bengali reports use culturally appropriate, natural terminology rather than raw transliteration:
   - "ম্যানগ্রোভ এলাকার পরিবর্তন" (Mangrove area change)
   - "সঞ্চিত নীল কার্বন মজুত" (Stored blue carbon stock)
   - "ভূমি-আবরণ শ্রেণিবিন্যাস" (Land-cover classification)
   - "মাঠ পর্যায়ে যাচাই" (Field verification)
2. **Standard Units**: Technical units remain standard ($\text{ha}$, $\text{Mg C}$, $\text{Mg CO}_2\text{e}$, $\%$).
3. **Typography**: ReportLab utilizes TrueType font detection (`NotoSansBengali-Regular.ttf`, `vrinda.ttf`, `Shonar.ttf`) with graceful Helvetica fallback.

---

## 3. PDF Architecture with ReportLab

- Generates binary PDF streams directly in memory using `io.BytesIO()`.
- Standard A4 page layout with margins, structured header banner, KPI statistics grid, observation callouts, stakeholder action tables, and statutory disclaimers.
- Fast generation ($< 50\text{ms}$) without heavy external headless browser dependencies like Puppeteer or WeasyPrint.

---

## 4. Mandatory Statutory Disclaimers

### English:
> "These results are model-based environmental estimates derived from satellite/geospatial classification and literature-based carbon factors. They are intended for monitoring, screening, and research support and should not be interpreted as field-verified carbon measurements, certified carbon credits, or guaranteed financial returns."

### Bengali:
> "এই ফলাফলগুলি স্যাটেলাইট/ভূ-স্থানিক শ্রেণিবিন্যাস এবং প্রকাশিত কার্বন ফ্যাক্টরের ভিত্তিতে তৈরি মডেল-ভিত্তিক পরিবেশগত অনুমান। এগুলি পর্যবেক্ষণ, প্রাথমিক যাচাই এবং গবেষণা সহায়তার জন্য ব্যবহারযোগ্য; মাঠ পর্যায়ে যাচাইকৃত কার্বন পরিমাপ, প্রত্যয়িত কার্বন ক্রেডিট বা নিশ্চিত আর্থিক আয় হিসেবে বিবেচনা করা যাবে না।"
