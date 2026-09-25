"""Run the GEE Random Forest mangrove pipeline for one village and save the result.

Requires live Earth Engine credentials (GEE_ENABLED=true plus a service account
or `earthengine authenticate`). Typical use, from backend/:

    python scripts/run_gee_pipeline.py --village gosaba
    python scripts/run_gee_pipeline.py --village gosaba --export projects/<proj>/assets/sbc

Outputs data/pipeline_results/<village>_<modelVersion>.json (+ <village>_latest.json),
which the API serves instead of demo data once present.
"""
import argparse
import json
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.geospatial.aoi import convert_to_ee_geometry, load_pilot_aoi  # noqa: E402
from app.geospatial.gee_client import initialize_gee  # noqa: E402
from app.pipeline import PipelineConfig, run_pipeline, save_result  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--village", default="gosaba")
    parser.add_argument("--aoi", default=None, help="GeoJSON path; defaults to SUNDARBAN_AOI_PATH")
    parser.add_argument("--train-years", nargs="*", type=int, default=None)
    parser.add_argument("--test-year", type=int, default=None)
    parser.add_argument("--predict-years", nargs="*", type=int, default=None)
    parser.add_argument("--trees", type=int, default=None)
    parser.add_argument("--export", default=None, help="Asset prefix to export classified rasters to")
    parser.add_argument("--dry-run", action="store_true", help="Print the config and model version, then exit")
    args = parser.parse_args()

    overrides = {k: v for k, v in {
        "train_years": args.train_years,
        "test_year": args.test_year,
        "predict_years": args.predict_years,
        "rf_trees": args.trees,
        "export_asset_prefix": args.export,
    }.items() if v is not None}
    config = PipelineConfig.from_settings(village_id=args.village, **overrides)
    config.validate()

    print(f"Model version : {config.model_version}")
    print(f"Train years   : {config.train_years}   Test year: {config.test_year}")
    print(f"Predict years : {config.predict_years}")
    if args.dry_run:
        return 0

    ok, code, msg = initialize_gee()
    if not ok:
        print(f"Earth Engine not available: {code} — {msg}", file=sys.stderr)
        return 2

    geometry = convert_to_ee_geometry(load_pilot_aoi(args.aoi))
    result = run_pipeline(config, geometry)
    path = save_result(result)

    acc = result["accuracy"]
    print(f"\n{config.test_year} test vs reference: OA={acc['overallAccuracy']:.3f} kappa={acc['kappa']:.3f}")
    for row in result["annual"]:
        print(f"  {row['year']}: mangrove {row['mangroveHa']:.1f} ha  (low-confidence {row['lowConfidenceHa']:.1f} ha)")
    for ch in result["changes"]:
        print(f"  {ch['fromYear']}→{ch['toYear']}: +{ch['gainHa']:.1f} / -{ch['lossHa']:.1f} ha  net {ch['netChangeHa']:+.1f}")
    print(f"\nSaved: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
