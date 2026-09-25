@echo off
REM Sundarban Blue Carbon - double-click to run backend + frontend and open the dashboard.
cd /d "%~dp0"
if not exist "node_modules" call npm install
if not exist "backend\.venv" call npm run setup
start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:5173/dashboard"
npm start
