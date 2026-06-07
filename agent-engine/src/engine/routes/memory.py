from fastapi import APIRouter
from src.engine.schemas import MemoryReadRequest, MemoryReadResponse, MemoryWriteRequest, MemoryWriteResponse
from src.engine.memory.store import memory_store

router = APIRouter()

@router.post("/read", response_model=MemoryReadResponse)
async def read_memory(request: MemoryReadRequest):
    """
    Retrieve message history for a specific session ID.
    Messages are returned in chronological order.
    """
    messages = memory_store.read_history(request.session_id, limit=request.limit)
    return MemoryReadResponse(messages=messages)

@router.post("/write", response_model=MemoryWriteResponse)
async def write_memory(request: MemoryWriteRequest):
    """
    Append a new message to the session's history.
    """
    # Simply fire-and-forget append for the sqlite instance
    memory_store.append_message(request.session_id, request.role, request.content)
    return MemoryWriteResponse(success=True)
