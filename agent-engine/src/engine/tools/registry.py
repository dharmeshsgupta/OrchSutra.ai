from datetime import datetime
from typing import Dict, Any, Callable

# Simple type for a tool definition
class ToolDef:
    def __init__(self, name: str, description: str, schema: Dict[str, Any], func: Callable):
        self.name = name
        self.description = description
        self.schema = schema
        self.func = func

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.schema
            }
        }

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, ToolDef] = {}

    def register(self, tool_def: ToolDef):
        self.tools[tool_def.name] = tool_def

    def execute(self, name: str, args: Dict[str, Any]) -> Any:
        if name not in self.tools:
            raise ValueError(f"Tool '{name}' is not registered.")
        return self.tools[name].func(**args)
    
    def get_tool_schemas(self, allowed_tools: list[str] = []) -> list[Dict[str, Any]]:
        """Return the schema array required by LLMs for the specified list of tools. Empty list means return all tools."""
        if not allowed_tools:
            return [tool.to_openai_schema() for tool in self.tools.values()]
        
        filtered_schemas = []
        for name in allowed_tools:
            if name in self.tools:
                filtered_schemas.append(self.tools[name].to_openai_schema())
        return filtered_schemas

registry = ToolRegistry()

# --- Implement basic tools ---

def cmd_time_now() -> str:
    """Returns the current UTC ISO timestamp."""
    return datetime.utcnow().isoformat()

registry.register(ToolDef(
    name="time_now",
    description="Get the current date and time in ISO format.",
    schema={
        "type": "object",
        "properties": {},
        "additionalProperties": False,
    },
    func=cmd_time_now
))


def cmd_math_add(a: float, b: float) -> Dict[str, float]:
    """Adds two numbers together."""
    return {"result": a + b}

registry.register(ToolDef(
    name="math_add",
    description="Add two numeric values together and return the result.",
    schema={
        "type": "object",
        "properties": {
            "a": {
                "type": "number",
                "description": "The first number"
            },
            "b": {
                "type": "number",
                "description": "The second number"
            }
        },
        "required": ["a", "b"],
        "additionalProperties": False,
    },
    func=cmd_math_add
))
