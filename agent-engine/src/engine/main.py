import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

from src.engine.config import config
from src.engine.routes import prompting_router, memory_router, tools_router, rag_router, agents_router, builder_router
from src.engine.routes.db_query import router as db_query_router
import logging
from contextlib import asynccontextmanager

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    from src.engine.clients.llm_router import llm_client
    logging.info(f"Effective LLM Router URL at runtime: {llm_client.url}")
    yield

app = FastAPI(title="Agent Engine", version="1.0.0", lifespan=lifespan)

app.include_router(prompting_router, prefix="/v1/prompt", tags=["prompting"])
app.include_router(memory_router, prefix="/v1/memory", tags=["memory"])
app.include_router(tools_router, prefix="/v1/tools", tags=["tools"])
app.include_router(rag_router, prefix="/v1/rag", tags=["rag"])
app.include_router(agents_router, prefix="/v1/agents", tags=["agents"])
app.include_router(db_query_router, prefix="/v1/db", tags=["db"])
app.include_router(builder_router, prefix="/v1/build", tags=["builder"])

cors_origins = [origin.strip() for origin in config.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"ok": True, "service": "agent-engine"}

