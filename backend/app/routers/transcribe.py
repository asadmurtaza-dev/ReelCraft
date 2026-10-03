from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models import TranscribeLinkRequest
from app.services.llm import transcribe_raw
from app.services.transcript_format import format_transcript
from app.services.link_transcript import transcript_from_link

router = APIRouter(prefix="/api/transcribe", tags=["transcribe"])

MAX_BYTES = 50 * 1024 * 1024  


@router.post("")
async def transcribe_video(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if len(content) > MAX_BYTES:
            raise HTTPException(400, "File too large for demo (50MB limit). Trim the clip and retry.")
        mime = file.content_type or "video/mp4"
        raw = await transcribe_raw(content, mime, file.filename or "upload.mp4")
        script = await format_transcript(raw)
        return {"filename": file.filename, "script": script}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/link")
async def transcribe_link(req: TranscribeLinkRequest):
    try:
        result = await transcript_from_link(req.url)
        return {"filename": req.url, **result}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))