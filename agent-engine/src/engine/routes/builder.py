"""
Builder API — Simplified, external-facing endpoints for creating and using agents.

Any external project can call these endpoints to build, chat with, and manage
agents WITHOUT knowing anything about LangChain, LangGraph, or the internal
pipeline. This is the "SDK layer".
"""

import uuid
from fastapi import APIRouter, HTTPException, Depends
from src.engine.auth import require_auth, require_auth_or_api_key

from src.engine.schemas import (
    BuildAgentRequest,
    BuildAgentResponse,
    BuildAgentEndpoints,
    BuildChatRequest,
    BuildChatResponse,
    BuildIngestRequest,
    BuildIngestResponse,
    BuildCapabilitiesResponse,
    AgentRunResponse,
    AgentSpec,
    AgentMemoryConfig,
    AgentRagConfig,
)
from src.engine.agents.persistence import agent_persistence
from src.engine.tools.registry import registry
from src.engine.rag.store import rag_store
from src.engine.memory.store import memory_store

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════
#  POST /agent — Build a new agent from a simplified spec
# ═══════════════════════════════════════════════════════════════════════

@router.post("/agent", response_model=BuildAgentResponse)
async def build_agent(body: BuildAgentRequest, user_id: str = Depends(require_auth)):
    """
    Create a complete agent from a simple JSON spec.
    Validates tools against the registry, persists the config, and returns
    ready-to-use API endpoints.
    """
    # Validate tools
    for tool_name in body.capabilities.tools:
        if tool_name not in registry.tools:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown tool '{tool_name}'. Available: {list(registry.tools.keys())}"
            )

    # Persist
    record = agent_persistence.create_from_build_request(
        user_id=user_id,
        name=body.basics.agentName,
        system_prompt=body.basics.systemPrompt,
        model_hint=body.basics.modelHint,
        tools=body.capabilities.tools,
        enable_memory=body.capabilities.enableMemory,
        enable_rag=body.capabilities.enableRagContext,
        topic_restriction=body.basics.topicRestriction,
    )

    return BuildAgentResponse(
        agent_id=record.id,
        api_key=record.api_key,
        name=record.name,
        status="ready",
        endpoints=BuildAgentEndpoints(
            run=f"/v1/agents/{record.id}/run",
            config=f"/v1/agents/{record.id}",
            chat=f"/v1/build/agent/{record.id}/chat",
            export=f"/v1/build/agent/{record.id}/export",
        ),
    )


# ═══════════════════════════════════════════════════════════════════════
#  POST /agent/{id}/chat — Simple chat interface
# ═══════════════════════════════════════════════════════════════════════

@router.post("/agent/{agent_id}/chat", response_model=BuildChatResponse)
async def chat_with_agent(agent_id: str, body: BuildChatRequest, _auth: str = Depends(require_auth_or_api_key)):
    """
    Simple chat endpoint — send a message, get a response.
    Auto-manages sessions and memory. No LangChain knowledge needed.
    """
    record = agent_persistence.get_agent(agent_id)
    if not record:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Auto-generate session if not provided
    session_id = body.session_id or f"agent-{agent_id}"

    # Build a runnable AgentSpec
    spec = AgentSpec(
        name=record.name,
        instructions=record.instructions,
        model_hint=record.model_hint,
        allowed_tools=record.allowed_tools,
        memory=AgentMemoryConfig(
            enabled=record.memory_enabled,
            session_id=session_id,
            limit=record.memory_limit,
        ),
        rag=AgentRagConfig(
            enabled=record.rag_enabled,
            collection=record.rag_collection or f"agent-{agent_id}",
            top_k=record.rag_top_k,
        ),
        input=body.message,
    )

    # Run the LangGraph pipeline (import here to avoid circular refs)
    from src.engine.routes.agents import agent_app, AgentState

    initial_state: AgentState = {
        "spec": spec,
        "rag_context_snippets": [],
        "used_tools": [],
        "messages": [],
        "tool_calls": None,
        "final_answer": "",
    }

    try:
        final_state = await agent_app.ainvoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")

    # Persist to memory
    if record.memory_enabled:
        memory_store.append_message(session_id, "user", body.message)
        if final_state["final_answer"]:
            memory_store.append_message(session_id, "assistant", final_state["final_answer"])

    return BuildChatResponse(
        response=final_state["final_answer"],
        tools_used=final_state["used_tools"],
        session_id=session_id,
    )


# ═══════════════════════════════════════════════════════════════════════
#  GET /capabilities — List platform capabilities
# ═══════════════════════════════════════════════════════════════════════

@router.get("/capabilities", response_model=BuildCapabilitiesResponse)
async def get_capabilities():
    """List all tools, models, and features the platform supports."""
    available_tools = [
        {"name": t.name, "description": t.description}
        for t in registry.tools.values()
    ]

    return BuildCapabilitiesResponse(
        available_tools=available_tools,
        available_models=[
            "openai/gpt-3.5-turbo",
            "openai/gpt-4o",
            "anthropic/claude-3",
        ],
        features={
            "memory": True,
            "rag": True,
            "tools": True,
            "streaming": True,
        },
    )


# ═══════════════════════════════════════════════════════════════════════
#  POST /agent/{id}/ingest — Upload documents for RAG
# ═══════════════════════════════════════════════════════════════════════

@router.post("/agent/{agent_id}/ingest", response_model=BuildIngestResponse)
async def ingest_documents(agent_id: str, body: BuildIngestRequest, user_id: str = Depends(require_auth)):
    """Upload plain text documents for an agent's RAG knowledge base."""
    record = agent_persistence.get_agent(agent_id)
    if not record or record.user_id != user_id:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")

    collection = record.rag_collection or f"agent-{agent_id}"
    count = rag_store.ingest(collection, body.documents)

    # Enable RAG on the agent if it wasn't already
    if not record.rag_enabled:
        from src.engine.schemas import AgentSpec, AgentMemoryConfig, AgentRagConfig
        spec = record.to_agent_spec("")
        spec.rag.enabled = True
        spec.rag.collection = collection
        agent_persistence.update_agent(agent_id, spec)

    return BuildIngestResponse(
        success=True,
        ingested_count=count,
        collection=collection,
    )


# ═══════════════════════════════════════════════════════════════════════
#  GET /agent/{id}/export — Export agent config as SDK JSON
# ═══════════════════════════════════════════════════════════════════════

@router.get("/agent/{agent_id}/export")
async def export_agent(agent_id: str, user_id: str = Depends(require_auth)):
    """
    Export a self-contained JSON configuration for an agent.
    Another project can read this and immediately know how to call the agent.
    """
    record = agent_persistence.get_agent(agent_id)
    if not record or record.user_id != user_id:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")

    api_base = "http://localhost:3002"

    return {
        "agent_id": record.id,
        "api_key": record.api_key,
        "agent_name": record.name,
        "api_base": api_base,
        "endpoints": {
            "chat": {
                "method": "POST",
                "url": f"{api_base}/v1/build/agent/{record.id}/chat",
                "body_schema": {
                    "message": "string (required)",
                    "session_id": "string (optional, auto-generated if omitted)",
                },
            },
            "ingest": {
                "method": "POST",
                "url": f"{api_base}/v1/build/agent/{record.id}/ingest",
                "body_schema": {
                    "documents": "array of strings",
                },
            },
            "config": {
                "method": "GET",
                "url": f"{api_base}/v1/agents/{record.id}",
            },
            "delete": {
                "method": "DELETE",
                "url": f"{api_base}/v1/agents/{record.id}",
            },
        },
        "config_snapshot": {
            "model": record.model_hint,
            "tools": record.allowed_tools,
            "memory_enabled": record.memory_enabled,
            "rag_enabled": record.rag_enabled,
            "system_prompt": record.instructions,
        },
        "example_curl": (
            f'curl -X POST {api_base}/v1/build/agent/{record.id}/chat '
            f'-H "Content-Type: application/json" '
            f'-d \'{{"message": "Hello!"}}\''
        ),
    }
