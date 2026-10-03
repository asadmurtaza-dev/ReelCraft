"""
Image generation with a free-first strategy.
- Pollinations.ai: no key, no signup, simple GET request. Used as default.
- Gemini/Imagen: higher quality, needs GEMINI_API_KEY, used if IMAGE_PROVIDER=gemini.
"""
import base64
import random
import urllib.parse
import httpx
from app.config import GEMINI_API_KEY, GEMINI_IMAGE_MODEL, IMAGE_PROVIDER

POLLINATIONS_BASE = "https://image.pollinations.ai/prompt"


async def generate_image(prompt: str, width: int = 1024, height: int = 576, provider: str | None = None) -> dict:
    """Returns {"provider": ..., "url": ... } or {"provider": ..., "b64": ...}"""
    provider = provider or IMAGE_PROVIDER

    if provider == "gemini":
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set — cannot use Gemini/Imagen for images")
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_IMAGE_MODEL}:predict"
        )
        body = {"instances": [{"prompt": prompt}], "parameters": {"sampleCount": 1}}
        headers = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
        b64 = data["predictions"][0]["bytesBase64Encoded"]
        return {"provider": "gemini", "b64": b64}

    
    seed = random.randint(1, 999_999)
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"{POLLINATIONS_BASE}/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
    return {"provider": "pollinations", "url": url}
