"""Plain-language "how sure are we?" rating for one analysis.

Non-experts read the headline numbers and nothing else, so the bundle carries
a traffic-light level plus the reasons, in simple English and Bengali:

- "high"   every check passed
- "medium" something weakens the result (few images, fast change, ...)
- "low"    something is known to produce false change (season mismatch,
           model disagrees with the reference map, almost no images)
- "demo"   synthetic data; not a measurement at all
"""
from typing import Any, Dict, List

from .request import AnalysisRequest

# Faster than this (share of the starting forest per year) is rare for real
# mangrove change and usually means an imagery problem; worth a field check.
FAST_CHANGE_PCT_PER_YEAR = 5.0


def _check(cid: str, severity: str, en: str, bn: str) -> Dict[str, str]:
    return {"id": cid, "severity": severity, "en": en, "bn": bn}


def assess(req: AnalysisRequest, bundle: Dict[str, Any]) -> Dict[str, Any]:
    if not bundle["dataSource"]["isRealData"]:
        return {
            "level": "demo",
            "problems": [
                _check(
                    "demo", "high",
                    "Demo data: satellite connection is off, so these numbers are made up to show how the page works.",
                    "ডেমো তথ্য: উপগ্রহ সংযোগ বন্ধ, তাই সংখ্যাগুলি শুধু পেজটি কীভাবে কাজ করে তা দেখানোর জন্য বানানো।",
                )
            ],
        }

    problems: List[Dict[str, str]] = []
    gap = abs(req.start_date.month - req.end_date.month)
    if min(gap, 12 - gap) > 2:
        problems.append(_check(
            "season", "high",
            "The two dates are in different seasons (e.g. dry vs rainy). Water and clouds can look like lost forest. "
            "Compare the same months of each year.",
            "দুটি তারিখ আলাদা মৌসুমে (যেমন শুকনো বনাম বর্ষা)। জল আর মেঘকে বন হারানো বলে ভুল হতে পারে। "
            "প্রতি বছরের একই মাস তুলনা করুন।",
        ))

    area_check = (bundle.get("accuracy") or {}).get("areaCheck")
    if area_check and not area_check.get("agrees", True):
        problems.append(_check(
            "area_check", "high",
            "Our forest map does not match the scientific reference map for this place (common near villages, "
            "where trees and fields can look like mangrove).",
            "এই জায়গায় আমাদের বনের মানচিত্র বৈজ্ঞানিক রেফারেন্স মানচিত্রের সঙ্গে মেলেনি (গ্রামের কাছে এমন হয়, "
            "যেখানে গাছপালা ও খেত ম্যানগ্রোভের মতো দেখায়)।",
        ))

    counts = [p.get("imageCount") for p in (bundle["timeline"][0], bundle["timeline"][-1])]
    counts = [c for c in counts if c is not None]
    if counts and min(counts) < 3:
        problems.append(_check(
            "images", "high",
            "Almost no clear satellite photos were found for one of the dates (too cloudy).",
            "একটি তারিখে প্রায় কোনো পরিষ্কার উপগ্রহ ছবি পাওয়া যায়নি (খুব মেঘলা)।",
        ))
    elif counts and min(counts) < 5:
        problems.append(_check(
            "images", "medium",
            "Only a few clear satellite photos were found for one of the dates.",
            "একটি তারিখে অল্প কয়েকটি পরিষ্কার উপগ্রহ ছবি পাওয়া গেছে।",
        ))

    start_ha = bundle["summary"]["start"]["mangroveHa"]
    rate = abs(bundle["change"]["percentChange"]) / max(req.span_years, 1e-6)
    if start_ha > 0 and rate > FAST_CHANGE_PCT_PER_YEAR:
        problems.append(_check(
            "fast_change", "medium",
            "The change is unusually fast for a mangrove forest. Please check on the ground before acting.",
            "ম্যানগ্রোভ বনের জন্য এই পরিবর্তন অস্বাভাবিক দ্রুত। ব্যবস্থা নেওয়ার আগে মাঠে গিয়ে দেখুন।",
        ))

    acc = bundle.get("accuracy")
    if acc and acc.get("overallAccuracy", 1.0) < 0.85:
        problems.append(_check(
            "accuracy", "medium",
            "The computer model was less accurate than usual in this area.",
            "এই এলাকায় কম্পিউটার মডেলের নির্ভুলতা স্বাভাবিকের চেয়ে কম।",
        ))

    if not req.inside_sundarban:
        problems.append(_check(
            "outside", "medium",
            "This place is outside the Sundarbans; the method is built for Sundarban mangroves.",
            "এই জায়গা সুন্দরবনের বাইরে; পদ্ধতিটি সুন্দরবনের ম্যানগ্রোভের জন্য তৈরি।",
        ))

    if any(p["severity"] == "high" for p in problems):
        level = "low"
    elif problems:
        level = "medium"
    else:
        level = "high"
    return {"level": level, "problems": problems}
