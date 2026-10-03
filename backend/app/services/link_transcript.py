"""Get a script from a video link.

1) YouTube link  -> try the video's own captions first (instant, no download).
2) Otherwise / no captions -> download just the audio with yt-dlp and run Whisper.
"""
import asyncio
import os
import re
import tempfile
from urllib.parse import urlparse, parse_qs

from app.services.llm import transcribe_raw
from app.services.transcript_format import format_transcript

MAX_AUDIO_BYTES = 24 * 1024 * 1024  
MIME_BY_EXT = {
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".webm": "audio/webm",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".wav": "audio/wav",
}


def youtube_id(url: str) -> str | None:
    u = urlparse(url.strip())
    host = (u.hostname or "").lower()
    for prefix in ("www.", "m.", "music."):
        if host.startswith(prefix):
            host = host[len(prefix):]
    if host == "youtu.be":
        return u.path.lstrip("/").split("/")[0] or None
    if host == "youtube.com":
        if u.path == "/watch":
            return (parse_qs(u.query).get("v") or [None])[0]
        m = re.match(r"^/(shorts|embed|live|v)/([\w-]{6,})", u.path)
        if m:
            return m.group(2)
    return None


def _fetch_captions_sync(video_id: str) -> str | None:
    from youtube_transcript_api import YouTubeTranscriptApi

    transcripts = list(YouTubeTranscriptApi().list(video_id))
    if not transcripts:
        return None
    # prefer captions a human wrote over auto-generated ones
    transcripts.sort(key=lambda t: bool(getattr(t, "is_generated", True)))
    fetched = transcripts[0].fetch()
    text = " ".join(snippet.text.replace("\n", " ") for snippet in fetched).strip()
    return text or None


def _download_audio_sync(url: str, out_dir: str) -> str | None:
    import yt_dlp

    opts = {
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": os.path.join(out_dir, "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": MAX_AUDIO_BYTES,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = ydl.prepare_filename(info)
    return path if os.path.exists(path) else None


async def transcript_from_link(url: str) -> dict:
    url = (url or "").strip()
    if not re.match(r"^https?://", url):
        raise ValueError("Paste a full link that starts with http:// or https://")

    vid = youtube_id(url)
    if vid:
        try:
            captions = await asyncio.to_thread(_fetch_captions_sync, vid)
        except Exception:
            captions = None  # no captions, blocked, private... fall back to audio
        if captions:
            return {"script": await format_transcript(captions), "method": "captions", "source": url}

    with tempfile.TemporaryDirectory() as tmp:
        try:
            path = await asyncio.to_thread(_download_audio_sync, url, tmp)
        except Exception as e:
            msg = str(e).splitlines()[0][:200] if str(e) else "unknown error"
            raise RuntimeError(f"Couldn't download audio from this link ({msg}). "
                               "Check the link is public, or upload the file instead.")
        if not path:
            raise RuntimeError("This video's audio is larger than the 24MB free limit. "
                               "Try a shorter video, or a YouTube link that has captions.")
        with open(path, "rb") as f:
            data = f.read()
        ext = os.path.splitext(path)[1].lower()
        raw = await transcribe_raw(data, MIME_BY_EXT.get(ext, "audio/mp4"), os.path.basename(path))

    return {"script": await format_transcript(raw), "method": "audio", "source": url}