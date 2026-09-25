"""Plain-language EN/BN explanation of an analysis bundle.

The templated narrative is always produced. When `use_ai` is set and Gemini is
configured, Gemini may rephrase it, but only from a numbered evidence list, and
its text is rejected (falling back to the template) if it cites unknown
evidence, makes a forbidden claim, or contains any number that is not in the
evidence. Gemini explains numbers; it never produces them.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from ..core.config import settings
from ..data.evidence_rules import check_forbidden_claims

logger = logging.getLogger("sundarban.analysis.narrative")

_BN_DIGITS = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
_ASCII_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")


def bn(text: str) -> str:
    return text.translate(_BN_DIGITS)


def _fmt(v: float, digits: int = 1) -> str:
    return f"{v:,.{digits}f}"


# --------------------------------------------------------------------------- #
# Evidence
# --------------------------------------------------------------------------- #
def build_evidence(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    s, e = bundle["summary"]["start"], bundle["summary"]["end"]
    ch = bundle["change"]
    c_end = bundle["carbon"]["end"]
    c_ch = bundle["carbon"]["change"]
    items = [
        ("mangrove_start_ha", "Mangrove area at start", s["mangroveHa"], "ha"),
        ("mangrove_end_ha", "Mangrove area at end", e["mangroveHa"], "ha"),
        ("mangrove_start_pct", "Mangrove share of area at start", s["mangrovePct"], "%"),
        ("mangrove_end_pct", "Mangrove share of area at end", e["mangrovePct"], "%"),
        ("net_change_ha", "Net mangrove change", ch["netChangeHa"], "ha"),
        ("gain_ha", "Gross mangrove gain", ch["gainHa"], "ha"),
        ("loss_ha", "Gross mangrove loss", ch["lossHa"], "ha"),
        ("uncertain_ha", "Change area too uncertain to count", ch["uncertainHa"], "ha"),
        ("carbon_end_mgc", "Carbon stock at end", c_end["carbonMgC"], "Mg C"),
        ("carbon_end_low_mgc", "Carbon stock at end, low", c_end["carbonRangeMgC"][0], "Mg C"),
        ("carbon_end_high_mgc", "Carbon stock at end, high", c_end["carbonRangeMgC"][1], "Mg C"),
        ("carbon_uncertainty_pct", "Carbon stock uncertainty", c_end["uncertaintyPct"], "%"),
        ("co2e_end_mg", "CO2-equivalent stock at end", c_end["co2eMg"], "Mg CO2e"),
        ("co2e_change_mg", "CO2-equivalent stock change", c_ch["co2eChangeMg"], "Mg CO2e"),
        ("span_years", "Years between start and end", bundle["request"]["spanYears"], "years"),
        ("aoi_area_ha", "Area analysed", bundle["request"]["aoiAreaHa"], "ha"),
    ]
    acc = bundle.get("accuracy")
    if acc:
        items.append(("overall_accuracy_pct", "Overall accuracy on held-out year", round(acc["overallAccuracy"] * 100, 1), "%"))
        items.append(("kappa", "Kappa on held-out year", acc["kappa"], ""))
    for sc in bundle["projection"]["scenarios"]:
        last = sc["points"][-1]
        items.append((f"proj_{sc['id']}_ha", f"{sc['name']} scenario area in {last['yearsAhead']} years", last["mangroveHa"], "ha"))
    return [
        {"id": f"E{i + 1}", "metric": m, "label": label, "value": v, "unit": u}
        for i, (m, label, v, u) in enumerate(items)
    ]


# --------------------------------------------------------------------------- #
# Templated narrative
# --------------------------------------------------------------------------- #
def templated_narrative(bundle: Dict[str, Any]) -> Dict[str, Any]:
    req = bundle["request"]
    s, e = bundle["summary"]["start"], bundle["summary"]["end"]
    ch = bundle["change"]
    c_end, c_ch = bundle["carbon"]["end"], bundle["carbon"]["change"]
    proj = {sc["id"]: sc for sc in bundle["projection"]["scenarios"]}
    acc = bundle.get("accuracy")
    demo = not bundle["dataSource"]["isRealData"]
    net = ch["netChangeHa"]
    grew = net >= 0
    horizon = bundle["projection"]["horizonYears"]
    cur = proj["current_trend"]["points"][-1]
    hl = proj["higher_loss"]["points"][-1]
    rec = proj["recovery"]["points"][-1]

    en: List[str] = []
    if demo:
        en.append("Demo data: Earth Engine is not connected, so the numbers below are synthetic and only show how the analysis works.")
    en.append(
        f"Within {req['radiusKm']} km of the chosen point ({_fmt(req['aoiAreaHa'], 0)} ha), mangrove covered "
        f"{_fmt(s['mangroveHa'])} ha ({s['mangrovePct']}%) at the start ({req['startDate']}) and "
        f"{_fmt(e['mangroveHa'])} ha ({e['mangrovePct']}%) at the end ({req['endDate']})."
    )
    en.append(
        f"Over {req['spanYears']:.1f} years the forest {'grew' if grew else 'shrank'} by {_fmt(abs(net))} ha: "
        f"{_fmt(ch['gainHa'])} ha new mangrove and {_fmt(ch['lossHa'])} ha lost. "
        f"A further {_fmt(ch['uncertainHa'])} ha changed but the model was not confident, so it is not counted."
    )
    en.append(
        f"The mangrove at the end holds about {_fmt(c_end['carbonMgC'], 0)} tonnes of carbon "
        f"(range {_fmt(c_end['carbonRangeMgC'][0], 0)}–{_fmt(c_end['carbonRangeMgC'][1], 0)}, ±{c_end['uncertaintyPct']}%), "
        f"equal to {_fmt(c_end['co2eMg'], 0)} tonnes of CO2. The stock changed by {_fmt(c_ch['co2eChangeMg'], 0)} tonnes CO2e."
    )
    en.append(
        f"If the recent pattern continues, mangrove would be about {_fmt(cur['mangroveHa'])} ha in {horizon} years "
        f"({_fmt(cur['lowHa'])}–{_fmt(cur['highHa'])} ha). With doubled loss it could fall to {_fmt(hl['mangroveHa'])} ha; "
        f"with protection and planting it could reach {_fmt(rec['mangroveHa'])} ha. These are scenarios, not forecasts."
    )
    if acc:
        en.append(
            f"On a held-out year the classifier agreed with the reference map {round(acc['overallAccuracy'] * 100, 1)}% of the time "
            f"(kappa {acc['kappa']}). Field checks are still needed before acting on specific patches."
        )
    else:
        en.append("Classifier accuracy is not available for this run; treat the numbers as indicative.")

    bn_parts: List[str] = []
    if demo:
        bn_parts.append("ডেমো তথ্য: আর্থ ইঞ্জিন যুক্ত নেই, তাই নিচের সংখ্যাগুলি কৃত্রিম — শুধু বিশ্লেষণ কীভাবে কাজ করে তা দেখানোর জন্য।")
    bn_parts.append(bn(
        f"নির্বাচিত বিন্দুর {req['radiusKm']} কিমি এলাকায় ({_fmt(req['aoiAreaHa'], 0)} হেক্টর) শুরুতে ({req['startDate']}) "
        f"ম্যানগ্রোভ ছিল {_fmt(s['mangroveHa'])} হেক্টর ({s['mangrovePct']}%), শেষে ({req['endDate']}) "
        f"{_fmt(e['mangroveHa'])} হেক্টর ({e['mangrovePct']}%)।"
    ))
    bn_parts.append(bn(
        f"{req['spanYears']:.1f} বছরে বন {'বেড়েছে' if grew else 'কমেছে'} {_fmt(abs(net))} হেক্টর: "
        f"নতুন ম্যানগ্রোভ {_fmt(ch['gainHa'])} হেক্টর, হারিয়েছে {_fmt(ch['lossHa'])} হেক্টর। "
        f"আরও {_fmt(ch['uncertainHa'])} হেক্টরে পরিবর্তন দেখা গেলেও মডেল নিশ্চিত নয়, তাই তা গণনায় ধরা হয়নি।"
    ))
    bn_parts.append(bn(
        f"শেষে ম্যানগ্রোভে আনুমানিক {_fmt(c_end['carbonMgC'], 0)} টন কার্বন জমা আছে "
        f"(পরিসর {_fmt(c_end['carbonRangeMgC'][0], 0)}–{_fmt(c_end['carbonRangeMgC'][1], 0)}, ±{c_end['uncertaintyPct']}%), "
        f"যা {_fmt(c_end['co2eMg'], 0)} টন CO2-এর সমান। মজুতের পরিবর্তন {_fmt(c_ch['co2eChangeMg'], 0)} টন CO2e।"
    ))
    bn_parts.append(bn(
        f"সাম্প্রতিক ধারা চললে {horizon} বছরে ম্যানগ্রোভ হবে প্রায় {_fmt(cur['mangroveHa'])} হেক্টর "
        f"({_fmt(cur['lowHa'])}–{_fmt(cur['highHa'])})। ক্ষতি দ্বিগুণ হলে কমে {_fmt(hl['mangroveHa'])} হেক্টর হতে পারে; "
        f"সুরক্ষা ও রোপণে বেড়ে {_fmt(rec['mangroveHa'])} হেক্টর হতে পারে। এগুলি সম্ভাব্য চিত্র, পূর্বাভাস নয়।"
    ))
    if acc:
        bn_parts.append(bn(
            f"আলাদা রাখা একটি বছরে মডেল রেফারেন্স মানচিত্রের সঙ্গে {round(acc['overallAccuracy'] * 100, 1)}% মিলেছে "
            f"(কাপ্পা {acc['kappa']})। নির্দিষ্ট জায়গায় ব্যবস্থা নেওয়ার আগে মাঠে যাচাই দরকার।"
        ))
    else:
        bn_parts.append("এই বিশ্লেষণে মডেলের নির্ভুলতা পাওয়া যায়নি; সংখ্যাগুলি আনুমানিক হিসেবে দেখুন।")

    return {
        "source": "template",
        "model": None,
        "en": en,
        "bn": bn_parts,
        "disclaimerEn": "Indicative model estimates for monitoring and planning — not field-measured carbon and not carbon credits.",
        "disclaimerBn": "পর্যবেক্ষণ ও পরিকল্পনার জন্য মডেল-ভিত্তিক আনুমানিক হিসাব — মাঠে মাপা কার্বন বা কার্বন ক্রেডিট নয়।",
    }


# --------------------------------------------------------------------------- #
# Gemini (optional) + validator
# --------------------------------------------------------------------------- #
_NUMBER = re.compile(r"-?\d[\d,]*(?:\.\d+)?")
_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def numbers_in(text: str) -> List[float]:
    out = []
    # ISO dates are quoted from the request, not claims; drop them before scanning.
    for tok in _NUMBER.findall(_ISO_DATE.sub(" ", text.translate(_ASCII_DIGITS))):
        try:
            out.append(float(tok.replace(",", "")))
        except ValueError:
            continue
    return out


def validate_ai_text(
    paragraphs: List[str], refs: List[str], evidence: List[Dict[str, Any]], extra_allowed: List[float]
) -> List[str]:
    """Return a list of problems; empty means the text may be shown."""
    issues: List[str] = []
    ids = {e["id"] for e in evidence}
    if not refs:
        issues.append("no evidence references")
    bad = [r for r in refs if r not in ids]
    if bad:
        issues.append(f"unknown evidence ids {bad}")
    allowed = [float(e["value"]) for e in evidence if isinstance(e["value"], (int, float))] + extra_allowed
    for para in paragraphs:
        if check_forbidden_claims(para):
            issues.append("forbidden claim")
        for n in numbers_in(para):
            if 1985 <= n <= 2040 and n == int(n):
                continue  # a year
            if abs(n) <= 12 and n == int(n):
                continue  # small counts like "5 years", "2 scenarios"
            if not any(abs(abs(n) - abs(v)) <= max(0.51, 0.01 * abs(v)) for v in allowed):
                issues.append(f"number {n} not in evidence")
    return issues


def _gemini_rewrite(bundle: Dict[str, Any], evidence: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    try:
        import google.generativeai as genai  # noqa: WPS433
    except ImportError:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(model_name=settings.GEMINI_MODEL)
    prompt = (
        "You explain mangrove monitoring results to village councils in the Sundarbans.\n"
        "Use ONLY the numbers in the evidence list; do not compute or invent any number. "
        "Never claim carbon credits, revenue, exact measurement, or confirmed causes. "
        "Say scenarios are not forecasts. If isRealData is false, say clearly it is demo data.\n"
        "Return JSON: {\"en\": [4-6 short paragraphs], \"bn\": [same in simple Bengali], "
        "\"evidenceReferences\": [ids used]}.\n\n"
        f"isRealData: {bundle['dataSource']['isRealData']}\n"
        f"period: {bundle['request']['startDate']} to {bundle['request']['endDate']}\n"
        f"evidence: {json.dumps(evidence, ensure_ascii=False)}"
    )
    try:
        resp = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        return json.loads(resp.text)
    except Exception as e:
        logger.warning(f"[Narrative] Gemini call failed: {e}")
        return None


def build_narrative(bundle: Dict[str, Any], use_ai: bool) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    evidence = build_evidence(bundle)
    narrative = templated_narrative(bundle)
    narrative["aiStatus"] = "not_requested"
    if not use_ai:
        return narrative, evidence
    if not settings.GEMINI_API_KEY:
        narrative["aiStatus"] = "not_configured"
        return narrative, evidence

    raw = _gemini_rewrite(bundle, evidence)
    if not raw or not isinstance(raw.get("en"), list) or not isinstance(raw.get("bn"), list):
        narrative["aiStatus"] = "failed_fallback_template"
        return narrative, evidence

    # Numbers the template itself prints (radius, ranges) are also legitimate.
    r = bundle["request"]
    # Day-of-month from the chosen dates ("31 March 2026") is also legitimate.
    days = [float(d[8:10]) for d in (r["startDate"], r["endDate"])]
    extra = days + [r["radiusKm"], bundle["carbon"]["end"]["co2eRangeMg"][0], bundle["carbon"]["end"]["co2eRangeMg"][1]]
    for sc in bundle["projection"]["scenarios"]:
        extra += [sc["points"][-1]["lowHa"], sc["points"][-1]["highHa"]]
    issues = validate_ai_text(raw["en"] + raw["bn"], raw.get("evidenceReferences") or [], evidence, extra)
    if issues:
        logger.warning(f"[Narrative] Gemini text rejected: {issues}")
        narrative["aiStatus"] = "rejected_fallback_template"
        narrative["aiIssues"] = issues[:5]
        return narrative, evidence

    narrative.update(
        {
            "source": "gemini_validated",
            "model": settings.GEMINI_MODEL,
            "en": [str(p) for p in raw["en"]],
            "bn": [str(p) for p in raw["bn"]],
            "evidenceReferences": raw.get("evidenceReferences"),
            "aiStatus": "success",
        }
    )
    return narrative, evidence
