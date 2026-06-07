import httpx
import asyncio

async def test():
    try:
        print("Checking API...")
        r = await httpx.AsyncClient(timeout=60.0).post(
            'https://dharmesh-api.onrender.com/chat/completions',
            json={
                'model':'groq-llama-3.3-70b',
                'messages':[{'role':'user','content':'hello'}],
                'selected_model_id':'groq-llama-3.3-70b',
                'auto_switch':False
            }
        )
        print("Status code:", r.status_code)
        print("Response text:", r.text)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
