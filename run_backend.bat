@echo off
cd "%~dp0primary-backend"
..\venv\Scripts\activate.bat
python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload
pause
