@echo off
cd /d "%~dp0"
call .\venv\Scripts\activate.bat
cd primary-backend
python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload
pause
