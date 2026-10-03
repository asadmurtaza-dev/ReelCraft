"""
Every router calls into THIS file, not a specific provider directly.
Switch providers with LLM_PROVIDER in backend/.env — nothing else changes.
"""
from app.config import LLM_PROVIDER
from app.services import groq_client
from app.services import gemini as gemini_client


async def generate_text(prompt: str, system_instruction: str | None = None, json_mode: bool = False) -> str:
    if LLM_PROVIDER == "gemini":
        return await gemini_client.generate_text(prompt, system_instruction, json_mode)
    return await groq_client.generate_text(prompt, system_instruction, json_mode)


async def generate_json(prompt: str, system_instruction: str | None = None) -> dict:
    if LLM_PROVIDER == "gemini":
        return await gemini_client.generate_json(prompt, system_instruction)
    return await groq_client.generate_json(prompt, system_instruction)


async def transcribe_media(file_bytes: bytes, mime_type: str, filename: str = "upload.mp4") -> str:
    if LLM_PROVIDER == "gemini":
        return await gemini_client.transcribe_media(file_bytes, mime_type)
    return await groq_client.transcribe_media(file_bytes, mime_type, filename)

async def transcribe_raw(file_bytes: bytes, mime_type: str, filename: str = "upload.mp4") -> str:
    """Transcript without the cleanup pass (used for long media, cleaned in chunks later)."""
    if LLM_PROVIDER == "gemini":
        return await gemini_client.transcribe_media(file_bytes, mime_type)
    return await groq_client.transcribe_raw(file_bytes, mime_type, filename)
