import httpx
import asyncio

async def test_render():
    url = "https://ai-tracking-engine.onrender.com/health"
    print(f"Testing {url}...")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=10.0)
            print(f"Status: {r.status_code}")
            print(f"Body: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_render())
