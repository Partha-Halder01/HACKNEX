"""One-time backend setup.

    cd backend
    python install.py

Creates backend/.venv, installs requirements.txt into it and creates
backend/.env from .env.example (demo mode until Earth Engine keys are added).
Safe to run again: existing .venv and .env are kept.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
VENV = BACKEND / ".venv"
VENV_PYTHON = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def run(cmd) -> None:
    print("  $", " ".join(str(c) for c in cmd))
    if subprocess.call([str(c) for c in cmd]) != 0:
        sys.exit(f"\nFailed: {' '.join(str(c) for c in cmd)}")


def main() -> None:
    if sys.version_info < (3, 10):
        sys.exit("Python 3.10 or newer is required.")

    print("\n1/3  Python environment (backend/.venv)")
    if VENV_PYTHON.exists():
        print("  already exists - skipping")
    else:
        run([sys.executable, "-m", "venv", VENV])

    print("\n2/3  Backend packages (requirements.txt)")
    run([VENV_PYTHON, "-m", "pip", "install", "--upgrade", "pip", "--quiet"])
    run([VENV_PYTHON, "-m", "pip", "install", "-r", BACKEND / "requirements.txt"])

    print("\n3/3  Settings file (backend/.env)")
    env = BACKEND / ".env"
    if env.exists():
        print("  backend/.env already exists - kept as is")
    else:
        shutil.copy(BACKEND / ".env.example", env)
        print("  created backend/.env (demo mode until you add the Earth Engine key)")

    print("\nDone. Start the backend with:\n\n    python run.py\n")


if __name__ == "__main__":
    main()
