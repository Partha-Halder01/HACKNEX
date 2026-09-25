@echo off
REM Sundarban Blue Carbon - start backend + frontend and open the dashboard.
REM Double-click this file. Close the two server windows to stop.
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Backend environment missing. First-time setup:
  echo   python -m venv backend\.venv
  echo   backend\.venv\Scripts\pip install -r backend\requirements.txt
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Installing frontend packages...
  call npm install
)

start "Sundarban Backend (port 8000)" cmd /k backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000
start "Sundarban Frontend (port 5173)" cmd /k npm run dev

echo Waiting for servers to start...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173/dashboard
