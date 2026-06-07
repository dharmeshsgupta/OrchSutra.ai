import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # 1. Ping rankings (GET /rankings/history) to see if database/primary-backend is working at all
        try:
            r1 = await client.get('https://primary-backend-5x4d.onrender.com/rankings/history')
            print("Rankings status:", r1.status_code)
            print("Rankings text snippet:", r1.text[:200])
        except Exception as e:
            print("Rankings error:", e)

        # 2. Check chat/options to see what models are returned
        try:
            r2 = await client.get('https://primary-backend-5x4d.onrender.com/chat/options')
            print("Chat options status:", r2.status_code)
            print("Chat options text:", r2.text[:500])
        except Exception as e:
            print("Chat options error:", e)

        # 3. Test sending a request to /chat/completions to see the error
        try:
            r3 = await client.post(
                'https://primary-backend-5x4d.onrender.com/chat/completions',
                json={
                    'model': 'groq-llama-3.3-70b',
                    'messages': [{'role': 'user', 'content': 'hello'}],
                    'selected_model_id': 'groq-llama-3.3-70b',
                    'auto_switch': False
                }
            )
            print("Chat completions status:", r3.status_code)
            print("Chat completions response:", r3.text)
        except Exception as e:
            print("Chat completions error:", e)

asyncio.run(test())
