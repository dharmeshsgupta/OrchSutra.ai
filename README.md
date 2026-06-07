# OrchSutra.ai

Multi-provider AI routing and agent builder platform powered by FastAPI + React.

The stack includes:
- API routing backend for provider abstraction and failover
- Primary backend for app/auth/modules
- Agent engine for workflow orchestration
- Frontend dashboard with Agent Builder and playground

## Architecture

Services and default local ports:
- Frontend (`dashboard-frontend`) -> `5173`
- API routing backend (`api-backend`) -> `3000`
- Primary backend (`primary-backend`) -> `3001`
- Agent engine (`agent-engine`) -> `3002`

## Quick Start (Windows)

Use separate terminals for each service.

### 1) Frontend
```bash
cd dashboard-frontend
npm install
npm run dev
```

### 2) API Routing Backend
```bash
cd api-backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

### 3) Primary Backend
```bash
cd primary-backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn src.apps:app --host 0.0.0.0 --port 3001 --reload
```

### 4) Agent Engine
```bash
cd agent-engine
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn src.engine.main:app --host 0.0.0.0 --port 3002 --reload
```

## Environment Variables

Set provider keys in the backend `.env` files (kept out of git):
- `OPENAI_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- other provider keys as needed

## Common Troubleshooting

### `Selected model not found`
- Cause: selected model ID is not present in `api-backend/src/main.py` `MODEL_STORE` or not loaded in-memory.
- Fix: add/patch model entry and restart the API backend.

### `model_decommissioned` (Groq)
- Cause: old provider model ID (deprecated).
- Fix: use active provider model IDs (for example, `llama-3.3-70b-versatile`).

### `429` quota/rate-limit errors (Gemini/OpenAI/etc.)
- Cause: provider account limit reached.
- Fix: switch model/provider, wait for quota reset, or update billing plan.

### Provider payload validation errors
- Cause: unsupported fields or null values in request payload.
- Fix: ensure adapters filter null fields and use provider-compatible schema.

## Notes

- Local model metadata is currently stored in-memory for fast iteration.
- For production, replace in-memory stores with persistent DB tables and migrations.
