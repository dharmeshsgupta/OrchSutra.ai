from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.engine.schemas import ToolExecuteRequest, ToolExecuteResponse
from src.engine.tools.registry import registry

router = APIRouter()

@router.post("/execute", response_model=ToolExecuteResponse)
async def execute_tool(request: ToolExecuteRequest):
    """
    Executes a locally registered tool by name with provided arguments.
    Errors gracefully on unknown tools or mismatched arguments.
    """
    if request.tool_name not in registry.tools:
        raise HTTPException(status_code=400, detail=f"Tool '{request.tool_name}' not found.")
        
    try:
        # Loosely passing dict args to function. Schema typing is trusted to generic kwargs.
        # This allows fast and generic implementation without strict runtime typed-validators.
        result = registry.execute(request.tool_name, request.arguments)
        return ToolExecuteResponse(result=result)
    except TypeError as type_err:
         raise HTTPException(
            status_code=400, 
            detail=f"Argument mismatch for tool '{request.tool_name}': {str(type_err)}"
         )
    except Exception as e:
        return ToolExecuteResponse(result=None, error=str(e))
