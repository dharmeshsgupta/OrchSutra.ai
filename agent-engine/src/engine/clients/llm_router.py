import httpx
from fastapi import HTTPException
from typing import List, Dict, Any, Optional

from src.engine.config import config

def parse_router_message(data: dict) -> dict:
    """Helper to safely extract standardize tool calls & history appending."""
    choices = data.get("choices", [])
    message = choices[0].get("message", {}) if choices else {}
    
    return {
        "text": message.get("content"),
        "tool_calls": message.get("tool_calls"),
        "message_for_history": message,
        "raw": data
    }


class LLMRouterClient:
    """HTTP Client for communicating with the primary LLM Routing API."""

    def __init__(self):
        self.base_url = config.LLM_ROUTER_BASE_URL.rstrip('/')
        self.chat_path = config.ROUTER_CHAT_PATH
        
        # Ensure path starts with slash
        if not self.chat_path.startswith('/'):
            self.chat_path = '/' + self.chat_path
            
        self.url = f"{self.base_url}{self.chat_path}"

    async def chat(
        self,
        messages: List[Dict[str, Any]],
        model_hint: Optional[str] = None,
        temperature: Optional[float] = None,
        tools: Optional[List[Dict[str, Any]]] = None
    ) -> dict:
        payload = {
            "messages": messages,
            "selected_model_id": model_hint or "gpt-4o",  # Provide a fallback just in case
            "parameters": {}
        }
        
        if temperature is not None:
            payload["parameters"]["temperature"] = temperature
        if tools is not None:
            payload["parameters"]["tools"] = tools

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.url, json=payload)
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                import logging
                logging.error(f"Failed to connect or router returned error. URL: {self.url}")
                # Capture the explicit non-200 error from the router and pass it back
                error_detail = f"Router HTTP {e.response.status_code}: {e.response.text}"
                try:
                    # Try to unpack a JSON error response if possible
                    json_error = e.response.json()
                    error_detail = json_error.get("detail", json_error)
                except Exception:
                    pass
                raise HTTPException(status_code=e.response.status_code, detail=error_detail)
            except httpx.RequestError as e:
                import logging
                logging.error(f"Failed to connect to router at URL: {self.url}")
                raise HTTPException(status_code=500, detail=f"Failed to connect to router at {self.url}: {str(e)}")

            data = response.json()
            
            return parse_router_message(data)

llm_client = LLMRouterClient()
