from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import os
import asyncio
from typing import List, Dict, Any, TypedDict, Optional
from langgraph.graph import StateGraph, START, END

from src.engine.schemas import AgentSpec, AgentRunResponse
from src.engine.clients.llm_router import llm_client
from src.engine.memory.store import memory_store
from src.engine.rag.store import rag_store
from src.engine.tools.registry import registry

router = APIRouter()

# Explicitly disable LangSmith tracing
os.environ["LANGCHAIN_TRACING_V2"] = "false"


# ═══════════════════════════════════════════════════════════════════════
#  State Definition
# ═══════════════════════════════════════════════════════════════════════

class AgentState(TypedDict):
    spec: AgentSpec
    rag_context_snippets: List[str]
    used_tools: List[str]
    messages: List[Dict[str, Any]]
    tool_calls: Optional[List[Dict[str, Any]]]
    final_answer: str


# ═══════════════════════════════════════════════════════════════════════
#  Graph Nodes
# ═══════════════════════════════════════════════════════════════════════

async def node_retrieve(state: AgentState) -> dict:
    """Node 1: RAG lookup — retrieve relevant context from the vector store."""
    spec = state["spec"]
    rag_snippets = []

    if spec.rag and spec.rag.enabled and spec.rag.collection:
        rag_results = rag_store.search(spec.rag.collection, spec.input, spec.rag.top_k)
        if rag_results:
            rag_snippets = [r["text"] for r in rag_results]

    return {"rag_context_snippets": rag_snippets}


async def node_generate(state: AgentState) -> dict:
    """Node 2: First LLM call — build the prompt and call the router."""
    spec = state["spec"]
    rag_context_snippets = state.get("rag_context_snippets", [])
    messages = []

    # 1. System Context & Instructions
    system_prompt_parts = []
    
    # Apply Guardrail FIRST if a restriction exists
    if hasattr(spec, 'topic_restriction') and spec.topic_restriction:
        guardrail = (
            f"CRITICAL SCOPE RULE: You are strictly restricted to discussing topics related to: {spec.topic_restriction}. "
            "If the user attempts to talk about ANY other topic, you must politely refuse to answer and remind them of your specialized purpose."
        )
        system_prompt_parts.append(guardrail)

    if spec.instructions:
        system_prompt_parts.append(spec.instructions)

    if rag_context_snippets:
        system_prompt_parts.append("Use the following context to answer the user:")
        for i, txt in enumerate(rag_context_snippets, 1):
            system_prompt_parts.append(f"Context [{i}]: {txt}")

    if system_prompt_parts:
        messages.append({"role": "system", "content": "\n\n".join(system_prompt_parts)})

    # 2. History Building
    if spec.memory and hasattr(spec.memory, 'enabled') and spec.memory.enabled and spec.memory.session_id:
        history = memory_store.read_history(spec.memory.session_id, limit=spec.memory.limit)
        messages.extend(history)

    # 3. User Input
    messages.append({"role": "user", "content": spec.input})

    # 4. Tool Registry Prep
    tool_schemas = None
    if spec.allowed_tools:
        tool_schemas = registry.get_tool_schemas(spec.allowed_tools)
        if not tool_schemas:
            tool_schemas = None

    # 5. First LLM Call
    try:
        resp = await llm_client.chat(
            messages=messages,
            model_hint=spec.model_hint,
            tools=tool_schemas
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}")

    final_answer = resp.get("text", "")
    tool_calls = resp.get("tool_calls")

    # Append assistant message to conversation
    messages.append(resp["message_for_history"])

    return {
        "final_answer": final_answer,
        "messages": messages,
        "tool_calls": tool_calls if isinstance(tool_calls, list) and len(tool_calls) > 0 else None,
    }


async def node_execute_tools(state: AgentState) -> dict:
    """Node 3: Execute all tool calls and append results to messages."""
    spec = state["spec"]
    tool_calls = state.get("tool_calls", []) or []
    messages = list(state.get("messages", []))
    used_tools = list(state.get("used_tools", []))

    for tool_call in tool_calls:
        function_data = tool_call.get("function", {})
        name = function_data.get("name")
        args_str = function_data.get("arguments", "{}")
        call_id = tool_call.get("id")

        try:
            args = json.loads(args_str)
        except (json.JSONDecodeError, TypeError):
            args = {}

        used_tools.append(name)

        if name in spec.allowed_tools or not spec.allowed_tools:
            try:
                result = registry.execute(name, args)
                result_str = json.dumps(result)
            except Exception as e:
                result_str = json.dumps({"error": str(e)})
        else:
            result_str = json.dumps({"error": f"Tool '{name}' is not allowed for this agent."})

        messages.append({
            "role": "tool",
            "tool_call_id": call_id,
            "name": name,
            "content": result_str
        })

    return {"messages": messages, "used_tools": used_tools}


async def node_synthesize(state: AgentState) -> dict:
    """Node 4: Second LLM call — synthesize final answer after tool results."""
    spec = state["spec"]
    messages = state.get("messages", [])

    try:
        resp = await llm_client.chat(
            messages=messages,
            model_hint=spec.model_hint
        )
        final_answer = resp.get("text", "")
        messages_out = list(messages)
        messages_out.append(resp.get("message_for_history", {"role": "assistant", "content": final_answer}))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Second LLM call failed: {str(e)}")

    return {"final_answer": final_answer, "messages": messages_out, "tool_calls": None}


# ═══════════════════════════════════════════════════════════════════════
#  Conditional Edge — decide whether to use tools or finish
# ═══════════════════════════════════════════════════════════════════════

def should_use_tools(state: AgentState) -> str:
    """Route to execute_tools if tool_calls are present, otherwise END."""
    tool_calls = state.get("tool_calls")
    if tool_calls and isinstance(tool_calls, list) and len(tool_calls) > 0:
        return "execute_tools"
    return END


# ═══════════════════════════════════════════════════════════════════════
#  Build the LangGraph State Machine
# ═══════════════════════════════════════════════════════════════════════

workflow = StateGraph(AgentState)

# Register nodes
workflow.add_node("retrieve", node_retrieve)
workflow.add_node("generate", node_generate)
workflow.add_node("execute_tools", node_execute_tools)
workflow.add_node("synthesize", node_synthesize)

# Wire edges
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_conditional_edges("generate", should_use_tools, {"execute_tools": "execute_tools", END: END})
workflow.add_edge("execute_tools", "synthesize")
workflow.add_edge("synthesize", END)

agent_app = workflow.compile()


# ═══════════════════════════════════════════════════════════════════════
#  API Routes
# ═══════════════════════════════════════════════════════════════════════

@router.post("/run", response_model=AgentRunResponse)
async def run_agent(spec: AgentSpec):
    """Run the full agent pipeline: retrieve → generate → (tools?) → synthesize."""
    initial_state: AgentState = {
        "spec": spec,
        "rag_context_snippets": [],
        "used_tools": [],
        "messages": [],
        "tool_calls": None,
        "final_answer": ""
    }

    try:
        final_state = await agent_app.ainvoke(initial_state)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution failed: {str(e)}")

    # Persist conversation to memory if enabled
    if spec.memory and spec.memory.enabled and spec.memory.session_id:
        memory_store.append_message(spec.memory.session_id, "user", spec.input)
        if final_state["final_answer"]:
            memory_store.append_message(spec.memory.session_id, "assistant", final_state["final_answer"])

    return AgentRunResponse(
        answer=final_state["final_answer"],
        used_tools=final_state["used_tools"],
        rag_context=final_state["rag_context_snippets"],
        messages=final_state["messages"]
    )


@router.post("/run/stream")
async def run_agent_stream(spec: AgentSpec):
    """
    Stream the agent pipeline as Server-Sent Events.
    Each event contains the node name and its output delta.
    """
    initial_state: AgentState = {
        "spec": spec,
        "rag_context_snippets": [],
        "used_tools": [],
        "messages": [],
        "tool_calls": None,
        "final_answer": ""
    }

    async def event_generator():
        try:
            async for event in agent_app.astream(initial_state):
                for node_name, node_output in event.items():
                    # Serialize — AgentSpec is Pydantic, so we need to handle it
                    safe_output = {}
                    for k, v in node_output.items():
                        if hasattr(v, "model_dump"):
                            safe_output[k] = v.model_dump()
                        else:
                            safe_output[k] = v
                    payload = json.dumps({"node": node_name, "data": safe_output})
                    yield f"data: {payload}\n\n"

            yield f"data: {json.dumps({'node': '__done__', 'data': {}})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'node': '__error__', 'data': {'error': str(e)}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ═══════════════════════════════════════════════════════════════════════
#  Agent CRUD Routes (Persistence)
# ═══════════════════════════════════════════════════════════════════════

from src.engine.agents.persistence import agent_persistence
from src.engine.schemas import AgentRecord, AgentListResponse
from pydantic import BaseModel
from fastapi import Depends
from src.engine.auth import require_auth


class RunSavedAgentRequest(BaseModel):
    input: str


@router.post("/save", response_model=AgentRecord)
async def save_agent(spec: AgentSpec, user_id: str = Depends(require_auth)):
    """Save an agent configuration for later re-use."""
    record = agent_persistence.create_agent(spec, user_id=user_id)
    return record


@router.get("/list", response_model=AgentListResponse)
async def list_saved_agents(user_id: str = Depends(require_auth)):
    """List all saved agent configurations."""
    agents = agent_persistence.list_agents(user_id=user_id)
    return AgentListResponse(agents=agents)


@router.get("/{agent_id}", response_model=AgentRecord)
async def get_saved_agent(agent_id: str, user_id: str = Depends(require_auth)):
    """Retrieve a specific saved agent configuration."""
    record = agent_persistence.get_agent(agent_id)
    if not record or record.user_id != user_id:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")
    return record


@router.put("/{agent_id}", response_model=AgentRecord)
async def update_saved_agent(agent_id: str, spec: AgentSpec, user_id: str = Depends(require_auth)):
    """Update an existing saved agent configuration."""
    record = agent_persistence.update_agent(agent_id, user_id, spec)
    if not record:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")
    return record


@router.delete("/{agent_id}")
async def delete_saved_agent(agent_id: str, user_id: str = Depends(require_auth)):
    """Delete a saved agent configuration."""
    deleted = agent_persistence.delete_agent(agent_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")
    return {"deleted": True}


@router.post("/{agent_id}/run", response_model=AgentRunResponse)
async def run_saved_agent(agent_id: str, body: RunSavedAgentRequest, user_id: str = Depends(require_auth)):
    """Load a saved agent and run it with the provided input message."""
    record = agent_persistence.get_agent(agent_id)
    if not record or record.user_id != user_id:
        raise HTTPException(status_code=404, detail="Agent not found or unauthorized")

    # Convert saved record → runnable spec
    spec = record.to_agent_spec(body.input)

    initial_state: AgentState = {
        "spec": spec,
        "rag_context_snippets": [],
        "used_tools": [],
        "messages": [],
        "tool_calls": None,
        "final_answer": ""
    }

    try:
        final_state = await agent_app.ainvoke(initial_state)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution failed: {str(e)}")

    # Persist conversation
    if spec.memory and spec.memory.enabled and spec.memory.session_id:
        memory_store.append_message(spec.memory.session_id, "user", spec.input)
        if final_state["final_answer"]:
            memory_store.append_message(spec.memory.session_id, "assistant", final_state["final_answer"])

    return AgentRunResponse(
        answer=final_state["final_answer"],
        used_tools=final_state["used_tools"],
        rag_context=final_state["rag_context_snippets"],
        messages=final_state["messages"]
    )
