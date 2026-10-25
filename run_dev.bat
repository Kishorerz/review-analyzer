@echo off
title Review Insight Dashboard Launcher
echo ============================================================
echo   Starting Review Insight AI Dashboard (Full Stack)
echo ============================================================
echo.
echo Starting Flask Backend API on http://127.0.0.1:5000 ...
start "Backend - Flask API (Port 5000)" cmd /k "cd /d %~dp0backend && python app.py"

echo Starting Vite React Frontend on http://localhost:3000 ...
start "Frontend - React Vite (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All processes launched successfully!
echo Open your browser to: http://localhost:3000
echo ============================================================
pause
