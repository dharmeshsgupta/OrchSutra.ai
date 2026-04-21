import json
import os
from typing import Dict, Any

class SimpleJSONStore:
    """Basic file-based JSON DB connector for configurations or state matching non-LangChain reqs."""
    
    def __init__(self, filename="agent_configs.json"):
        self.filename = filename
        if not os.path.exists(self.filename):
            with open(self.filename, 'w') as f:
                json.dump({}, f)

    def load_config(self, agent_id: str) -> Dict[str, Any]:
        with open(self.filename, 'r') as f:
            data = json.load(f)
        return data.get(agent_id, {})

    def save_config(self, agent_id: str, config: Dict[str, Any]):
        with open(self.filename, 'r') as f:
            data = json.load(f)
        data[agent_id] = config
        with open(self.filename, 'w') as f:
            json.dump(data, f, indent=4)
