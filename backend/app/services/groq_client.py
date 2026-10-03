"""
Groq — OpenAI-compatible API, free tier, no credit card, no known key-format
issues (unlike Gemini's current "AQ." key rollout problems).
Docs: https://console.groq.com/docs
Free key: https://console.groq.com/keys
"""
import asyncio
import json
import re
import httpx
from app.config import GROQ_API_KEY, GROQ_TEXT_MODEL, GROQ_WHISPER_MODEL

CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


def _headers() -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set in backend/.env")
    return {"Authorization": f"Bearer {GROQ_API_KEY}"}


def _raise_readable(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            detail = resp.text
        raise RuntimeError(f"Groq API error {resp.status_code}: {detail}")


def _retry_delay(resp: httpx.Response) -> float:
    """Read 'Please try again in 8.535s' / '850ms' from a 429 message."""
    try:
        msg = resp.json().get("error", {}).get("message", "")
    except Exception:
        msg = resp.text
    m = re.search(r"try again in ([\d.]+)(ms|s)", msg)
    if not m:
        return 5.0
    value = float(m.group(1))
    seconds = value / 1000 if m.group(2) == "ms" else value
    return min(seconds + 0.5, 30.0)


async def generate_text(prompt: str, system_instruction: str | None = None, json_mode: bool = False) -> str:
    messages = []
    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})
    messages.append({"role": "user", "content": prompt})

    body = {
        "model": GROQ_TEXT_MODEL,
        "messages": messages,
        "temperature": 0.9,
        "max_tokens": 4096,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
        if system_instruction:
            body["messages"][0]["content"] += " Respond ONLY with valid JSON, no markdown fences."
        else:
            body["messages"].insert(0, {"role": "system", "content": "Respond ONLY with valid JSON, no markdown fences."})

    data = None
    async with httpx.AsyncClient(timeout=90) as client:
        for attempt in range(5):
            resp = await client.post(CHAT_URL, headers={**_headers(), "Content-Type": "application/json"}, json=body)
            if resp.status_code == 429 and attempt < 4:
             
                wait = _retry_delay(resp)
                await asyncio.sleep(wait)
                continue
            _raise_readable(resp)
            data = resp.json()
            break

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Groq response: {json.dumps(data)[:500]}") from e


async def generate_json(prompt: str, system_instruction: str | None = None) -> dict:
    raw = await generate_text(prompt, system_instruction=system_instruction, json_mode=True)
    return json.loads(raw)

async def transcribe_raw(file_bytes: bytes, mime_type: str, filename: str = "upload.mp4") -> str:
    """Whisper on Groq accepts audio AND common video containers (mp4, webm, m4a...).
    Returns the raw transcript with no cleanup."""
    files = {"file": (filename, file_bytes, mime_type)}
    data = {"model": GROQ_WHISPER_MODEL, "response_format": "text"}

    async with httpx.AsyncClient(timeout=180) as client:
        for attempt in range(3):
            resp = await client.post(TRANSCRIBE_URL, headers=_headers(), files=files, data=data)
            if resp.status_code == 429 and attempt < 2:
                await asyncio.sleep(_retry_delay(resp))
                continue
            _raise_readable(resp)
            return resp.text
    return ""


async def transcribe_media(file_bytes: bytes, mime_type: str, filename: str = "upload.mp4") -> str:
    """Raw transcript + one cleanup pass (fine for short clips)."""
    raw_transcript = await transcribe_raw(file_bytes, mime_type, filename)
    return await generate_text(
        f"Clean up this raw transcript into a readable script: fix filler words, "
        f"add paragraph breaks at natural topic shifts, and label distinct speakers "
        f"if more than one voice is evident from context. Write PLAIN TEXT ONLY, "
        f"no markdown, no asterisks, no bullet points. "
        f"Return only the cleaned script.\n\nRAW TRANSCRIPT:\n{raw_transcript}",
        system_instruction="You are an expert transcript editor who outputs plain text only, never markdown.",
    )