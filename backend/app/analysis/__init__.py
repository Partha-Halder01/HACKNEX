"""On-demand analysis for a user-chosen location and date range.

Layout:
- request.py     validation of point / radius / dates, observation windows
- carbon.py      carbon stock and change with propagated ± uncertainty
- projection.py  3–5 year scenarios (current trend / higher loss / recovery)
- demo_engine.py deterministic stand-in observations when Earth Engine is offline
- gee_engine.py  live Sentinel-2 + Random Forest run for the chosen AOI
- narrative.py   EN/BN explanation (templated; Gemini optional and validated)
- service.py     orchestration: request → observations → analytics bundle

Numbers are only ever produced by the engines and the maths modules here;
the narrative layer explains them and is rejected if it invents any.
"""
from .request import AnalysisRequest, AnalysisRequestError
from .service import run_analysis, analysis_capabilities

__all__ = ["AnalysisRequest", "AnalysisRequestError", "run_analysis", "analysis_capabilities"]
