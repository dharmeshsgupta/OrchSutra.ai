import urllib.request
import json
import urllib.error

urls = [
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3.5-large",
    "https://ai.api.nvidia.com/v1/genai/stabilityai/sdxl-turbo",
    "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl-base-1.0"
]
headers = {
    "Authorization": "Bearer invalid_key",
    "Accept": "application/json",
    "Content-Type": "application/json",
}
data = json.dumps({"prompt": "dog", "response_format": "b64_json"}).encode("utf-8")

for url in urls:
    print(f"\nTesting {url}")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            print(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")
