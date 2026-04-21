import httpx
from typing import Dict, Any, List
import json
import os

from src.engine.memory import SimpleMemory
from src.engine.tools import SimpleToolExecutor
from src.engine.rag import SimpleRAG
from src.engine.db import SimpleJSONStore

class BaseAgent:
    """An agent that combines memory, tools, and RAG without LangChain."""
    
    def __init__(self, name: str, router_url: str):
        self.name = name
        self.router_url = router_url
        self.memory = SimpleMemory()
        self.tools = SimpleToolExecutor()
        self.rag = SimpleRAG()
        self.db = SimpleJSONStore()
        # Default prompt structure
        self.system_prompt = "You are an intelligent agent."
        
    def load_from_db(self):
        config = self.db.load_config(self.name)
        if "system_prompt" in config:
            self.system_prompt = config["system_prompt"]
            
    async def run(self, user_message: str, model: str = "openai/gpt-3.5-turbo"):
        # 1. Store user message in history
        self.memory.add_message("user", user_message)
        
        # 2. Get RAG context based on current query
        context_docs = self.rag.retrieve(user_message)
        rag_context = self.rag.format_context(context_docs)
        
        # 3. Format complete messages list
        # We inject RAG as system context or augmented user context depending on preference.
        messages = [
            {"role": "system", "content": f"{self.system_prompt}\n\n{rag_context}"}
        ]
        messages.extend(self.memory.get_context())
        
        # 4. API Call payload for standard chat format tools included
        payload = {
            "model": model,
            "messages": messages,
            # Example JSON schema for custom tools if the Router maps these correctly
            # "tools": [ ... custom schemas extracted dynamically ... ]
        }
        
        # 5. Call Router via pure HTTP
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.router_url}/v1/chat/completions",
                json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            
            message_response = data["choices"][0]["message"]
            content = message_response.get("content")
            
            # Check for function calling from Router
            if "tool_calls" in message_response:
                for tool_call in message_response["tool_calls"]:
                    tool_name = tool_call["function"]["name"]
                    args = json.loads(tool_call["function"]["arguments"])
                    # 6. Execute local tool code
                    result = self.tools.execute(tool_name, args)
                    
                    # For a basic example, we append tool result to memory 
                    # Note: real integration would make an entirely new API call roundtrip.
                    self.memory.add_message("tool", f"Result from {tool_name}: {result}")
            
            if content:
                self.memory.add_message("assistant", content)
                return content
            return message_response

