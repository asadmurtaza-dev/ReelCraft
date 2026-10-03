"""Turns a raw transcript of any length into a readable script.

Long transcripts are cleaned in chunks so we never send the model more than the
free-tier per-minute token limit allows in one request."""
from app.services.llm import generate_text
from app.services import prompts

CHUNK_CHARS = 7000
MAX_CLEANED_CHUNKS = 4      
WORDS_PER_PARAGRAPH = 90

SYSTEM = "You are an expert transcript editor who outputs plain text only, never markdown."


def _split(text: str, size: int) -> list[str]:
    chunks, rest = [], text.strip()
    while len(rest) > size:
        cut = rest.rfind(" ", 0, size)
        cut = cut if cut > size // 2 else size
        chunks.append(rest[:cut].strip())
        rest = rest[cut:].strip()
    if rest:
        chunks.append(rest)
    return chunks


def _paragraphs(text: str) -> str:
    words = text.split()
    return "\n\n".join(
        " ".join(words[i:i + WORDS_PER_PARAGRAPH]) for i in range(0, len(words), WORDS_PER_PARAGRAPH)
    )


async def format_transcript(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    chunks = _split(raw, CHUNK_CHARS)
    parts = []
    for c in chunks[:MAX_CLEANED_CHUNKS]:
        parts.append(
            await generate_text(
                "Clean up this part of a transcript into a readable script: fix filler words, "
                "add punctuation, and add paragraph breaks at natural topic shifts. Keep the "
                "speaker's wording. PLAIN TEXT ONLY, no markdown, no bullet points. "
                "Return only the cleaned text.\n\nTRANSCRIPT PART:\n" + c,
                system_instruction=SYSTEM,
            )
        )
    leftover = " ".join(chunks[MAX_CLEANED_CHUNKS:])
    if leftover:
        parts.append(_paragraphs(leftover))
    return prompts.strip_markdown("\n\n".join(parts))