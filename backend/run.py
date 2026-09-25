"""Start the backend API server.

    cd backend
    python run.py                 # http://localhost:8000, auto-reload on code changes

    python run.py --port 8001     # another port
    python run.py --no-reload     # no auto-reload (e.g. for a demo machine)

Also works from the project root: `python backend/run.py`.
Any `python` is fine: if backend/.venv exists, this script re-runs itself
inside it, so there is nothing to activate first.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
VENV_PYTHON = BACKEND / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def _inside_project_venv() -> bool:
    return Path(sys.prefix).resolve() == (BACKEND / ".venv").resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description="Start the Sundarban Blue Carbon backend.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-reload", action="store_true", help="disable auto-reload on code changes")
    args = parser.parse_args()

    if not _inside_project_venv():
        if VENV_PYTHON.exists():
            # Re-run with the project's own Python so its packages are used.
            return subprocess.call([str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]])
        print("Backend environment not found. Run this once first:\n\n    python install.py\n")
        return 1

    try:
        import uvicorn
    except ImportError:
        print("Backend packages are missing. Run:\n\n    python install.py\n")
        return 1

    os.chdir(BACKEND)
    print(f"Backend  -> http://localhost:{args.port}   (API docs: http://localhost:{args.port}/docs)", flush=True)
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
        reload_dirs=[str(BACKEND / "app")],
        app_dir=str(BACKEND),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
