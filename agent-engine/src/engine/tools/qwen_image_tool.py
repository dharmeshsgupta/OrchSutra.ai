import os
import httpx
from typing import Dict, Any
from .registry import ToolDef, registry

def cmd_generate_image(prompt: str, model: str = "alibaba/qwen-image") -> str:
    """Generates an image using NVIDIA API and returns a base64 markdown representation."""
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    if not api_key:
        return "Error: NVIDIA_API_KEY environment variable is not set."

    url = f"https://ai.api.nvidia.com/v1/genai/{model}"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    # Try the most minimal stable-diffusion/flux compatible payload format
    payload = {
        "prompt": prompt,
        "seed": 0,
        "aspect_ratio": "16:9",
        "output_format": "jpeg"
    }

    try:
        # We use sync httpx because tool_registry's func execute is sync
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, headers=headers, json=payload)
            
            if response.status_code >= 400:
                # Fallback to OpenAI standard payload
                fallback_url = "https://ai.api.nvidia.com/v1/images/generations"
                fallback_payload = {
                    "model": model,
                    "prompt": prompt,
                    "response_format": "b64_json"
                }
                response = client.post(fallback_url, headers=headers, json=fallback_payload)

            response.raise_for_status()
            data = response.json()
            
            # Extract image based on possible response formats
            b64_json = None
            
            # 1. OpenAI format
            if data.get("data") and len(data["data"]) > 0:
                b64_json = data["data"][0].get("b64_json")
            
            # 2. Artifacts format (Stability / NVIDIA genai format)
            if not b64_json and data.get("artifacts") and len(data["artifacts"]) > 0:
                b64_json = data["artifacts"][0].get("base64") or data["artifacts"][0].get("image")
                
            # 3. Direct base64/image
            if not b64_json:
                b64_json = data.get("b64_json") or data.get("base64") or data.get("image")
                
            if not b64_json:
                return "Error: The API did not return any image data."

            # Return image in markdown format so it can be rendered inline in chat
            return f"![Generated Image]({b64_json})"
            
    except Exception as e:
        return f"Error generating image: {str(e)}"

# Register the tool
registry.register(ToolDef(
    name="generate_image",
    description="Generate an image based on a text prompt using an AI image generation model like Qwen-Image.",
    schema={
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "A detailed description of the image to generate."
            },
            "model": {
                "type": "string",
                "description": "The name of the model to use (default: alibaba/qwen-image).",
                "default": "alibaba/qwen-image"
            }
        },
        "required": ["prompt"],
        "additionalProperties": False,
    },
    func=cmd_generate_image
))
