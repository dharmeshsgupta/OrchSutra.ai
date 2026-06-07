@echo off
echo ========================================
echo   Starting All OpenRouter Servers
echo ========================================
echo.

:: Start Primary Backend (port 3001)
echo [1/3] Starting Primary Backend on port 3001...
start "Primary Backend - Port 3001" cmd /k "cd /d %~dp0primary-backend && call ..\venv\Scripts\activate.bat && python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload"

:: Wait a moment before starting next server
timeout /t 2 /nobreak >nul

:: Start API Backend (port 3000)
echo [2/3] Starting API Backend on port 3000...
start "API Backend - Port 3000" cmd /k "cd /d %~dp0api-backend && call ..\venv\Scripts\activate.bat && python -m uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload"

:: Wait a moment before starting next server
timeout /t 2 /nobreak >nul

:: Start AGENT ENGINE (port 3002)
echo [3/4] Starting AGENT ENGINE on port 3002...
start "AGENT ENGINE - Port 3002" cmd /k "cd /d %~dp0agent-engine && call ..\venv\Scripts\activate.bat && python -m uvicorn src.engine.main:app --host 0.0.0.0 --port 3002 --reload"

:: Wait a moment before starting next server
timeout /t 2 /nobreak >nul

:: Start Dashboard Frontend (port 5173)
echo [3/3] Starting Dashboard Frontend on port 5173...
start "Dashboard Frontend - Port 5173" cmd /k "cd /d %~dp0dashboard-frontend && npm run dev"

echo.
echo ========================================
echo   All servers started!
echo ========================================
echo.
echo   Agent Engine:       http://localhost:3002
echo   Primary Backend:    http://localhost:3001
echo   API Backend:        http://localhost:3000
echo   Dashboard Frontend: http://localhost:5173
echo.
echo   Close the individual windows to stop each server.
echo ========================================
pause
