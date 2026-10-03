"""
Thin wrapper around Google's Gemini REST API.
Docs: https://ai.google.dev/gemini-api/docs
Free tier: https://aistudio.google.com/apikey

Auth note: Google now issues two key formats.
- Legacy keys start with "AIzaSy..." and work with either the x-goog-api-key
  header or the old ?key= query param.
- Newer "Authentication Keys" start with "AQ." and only work reliably with the
  x-goog-api-key header, so that's what this file uses everywhere.
"""
import base64
import json
import httpx
from app.config import GEMINI_API_KEY, GEMINI_TEXT_MODEL

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def _headers() -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in backend/.env")
    return {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}


def _raise_readable(resp: httpx.Response) -> None:
    if resp.status_code >= 400:
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            detail = resp.text
        if resp.status_code == 404:
            detail += (
                f" — check that GEMINI_TEXT_MODEL ('{GEMINI_TEXT_MODEL}') is still a live model; "
                "Google retires Gemini models on a rolling schedule, see "
                "https://ai.google.dev/gemini-api/docs/changelog"
            )
        if resp.status_code in (401, 403):
            detail += (
                " — if your key starts with 'AQ.', re-check it was copied in full from "
                "https://aistudio.google.com/apikey (no trailing characters trimmed)"
            )
        raise RuntimeError(f"Gemini API error {resp.status_code}: {detail}")


async def generate_text(prompt: str, system_instruction: str | None = None, json_mode: bool = False) -> str:
    """Single-turn text generation. Returns plain text (or JSON string if json_mode=True)."""
    url = f"{BASE_URL}/{GEMINI_TEXT_MODEL}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.9, "maxOutputTokens": 4096},
    }
    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(url, headers=_headers(), json=body)
        _raise_readable(resp)
        data = resp.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response: {json.dumps(data)[:500]}") from e


async def generate_json(prompt: str, system_instruction: str | None = None) -> dict:
    raw = await generate_text(prompt, system_instruction=system_instruction, json_mode=True)
    return json.loads(raw)


async def transcribe_media(file_bytes: bytes, mime_type: str) -> str:
    """Send audio/video bytes straight to Gemini (multimodal) and get a clean transcript back.
    Avoids needing a separate Whisper install for the hackathon build."""
    url = f"{BASE_URL}/{GEMINI_TEXT_MODEL}:generateContent"
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    body = {
        "contents": [{
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": mime_type, "data": b64}},
                {"text": (
                    "Transcribe this video/audio fully and accurately. "
                    "Then clean it up into a readable script format: fix filler words, "
                    "add paragraph breaks at natural topic shifts, and label distinct "
                    "speakers if more than one voice is present. Write PLAIN TEXT ONLY — "
                    "no markdown, no asterisks, no bold/italic symbols, no bullet points. "
                    "Return only the cleaned script."
                )},
            ],
        }],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
    }
    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(url, headers=_headers(), json=body)
        _raise_readable(resp)
        data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected Gemini response: {json.dumps(data)[:500]}") from e
