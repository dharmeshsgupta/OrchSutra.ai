import json
from fastapi import APIRouter
from src.engine.schemas import PromptStructureRequest, PromptStructureResponse

router = APIRouter()

@router.post("/structure", response_model=PromptStructureResponse)
async def structure_prompt(request: PromptStructureRequest):
    """
    Transforms the input request into a structured system prompt,
    a messages list, and optionally an output format hint.
    This is deterministic and performs no LLM calls.
    """
    
    # 1. Build the system prompt
    system_prompt = request.instructions if request.instructions else "You are a helpful AI assistant."
    
    # 2. Build the output format hint (if any schema is provided)
    output_format_hint = None
    if request.output_schema:
        schema_str = json.dumps(request.output_schema, indent=2)
        output_format_hint = f"Please enforce the following JSON output schema:\n```json\n{schema_str}\n```"
        # Often it's helpful to append the format hint to the system prompt
        system_prompt += f"\n\n{output_format_hint}"
        
    # 3. Construct the messages array
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.input}
    ]
    
    return PromptStructureResponse(
        system_prompt=system_prompt,
        messages=messages,
        output_format_hint=output_format_hint
    )
