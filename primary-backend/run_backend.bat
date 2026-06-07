@echo off
REM Activate virtual environment and run FastAPI backend
call ..\venv\Scripts\activate.bat

REM Run the FastAPI app with Uvicorn
python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload

pause
