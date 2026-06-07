from src.engine.tools.registry import registry
from dotenv import load_dotenv

load_dotenv()

try:
    print("Executing generate_image tool...")
    result = registry.execute("generate_image", {"prompt": "A small cute robotic cat in cyberpunk city"})
    print("Tool executed successfully. Result:")
    print(result[:200] + "..." if len(result) > 200 else result)
except Exception as e:
    print(f"Failed: {e}")
