# OpenRouter Local Development

## Services Overview

This project consists of 4 independent services running simultaneously:

1. **Frontend (React/Vite)**
   - Port: `5173`
   - Command: `npm run dev` (run from `dashboard-frontend/`)
   - Description: The web dashboard and Agent Builder interface.

2. **Primary Backend (FastAPI)**
   - Port: `3001`
   - Command: `python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload` (run from `primary-backend/`)
   - Description: Main application logic, user auth, models database.

3. **API Routing Backend (FastAPI)**
   - Port: `3000`
   - Command: `python -m uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload` (run from `api-backend/`)
   - Description: The LLM Router API proxy mimicking OpenRouter endpoint protocols.

4. **Agent Engine (FastAPI)**
   - Port: `3002`
   - Command: `python -m uvicorn src.engine.main:app --port 3002` (run from `agent-engine/`)
   - Description: Agent logic, prompting schemas, RAG, tool execution, memory caching.

## How to Run All Services

Ensure your main Python virtual environment is activated:
```bash
# Windows
.venv\Scripts\activate
```

Then, open 4 separate terminals and run the respective start commands:

**Terminal 1 (Frontend)**
```bash
cd dashboard-frontend
npm run dev
```

**Terminal 2 (Primary Backend)**
```bash
cd primary-backend
python -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload
```

**Terminal 3 (API Routing Backend)**
```bash
cd api-backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

**Terminal 4 (Agent Engine)**
```bash
cd agent-engine
pip install -r requirements.txt
python -m uvicorn src.engine.main:app --port 3002
```
