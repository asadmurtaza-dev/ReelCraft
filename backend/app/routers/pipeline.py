import json
from fastapi import APIRouter, HTTPException
from app.models import (
    ScriptRequest, ScenesRequest, ImagePromptsRequest,
    VideoPromptsRequest, SeoRequest, GenerateImageRequest,
)
from app.services.llm import generate_text, generate_json
from app.services.images import generate_image
from app.services import prompts

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/script")
async def make_script(req: ScriptRequest):
    try:
        text = await generate_text(
            prompts.script_prompt(req.topic, req.length_minutes, req.tone),
            system_instruction=prompts.SCRIPT_SYSTEM,
        )
        return {"script": prompts.strip_markdown(text)}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/scenes")
async def make_scenes(req: ScenesRequest):
    try:
        result = await generate_json(
            prompts.scenes_prompt(req.script),
            system_instruction=prompts.SCENES_SYSTEM,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/image-prompts")
async def make_image_prompts(req: ImagePromptsRequest):
    try:
        result = await generate_json(
            prompts.image_prompts_prompt(json.dumps(req.scenes)),
            system_instruction=prompts.IMAGE_PROMPT_SYSTEM,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/video-prompts")
async def make_video_prompts(req: VideoPromptsRequest):
    try:
        result = await generate_json(
            prompts.video_prompts_prompt(json.dumps(req.scenes)),
            system_instruction=prompts.VIDEO_PROMPT_SYSTEM,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/seo")
async def make_seo(req: SeoRequest):
    try:
        result = await generate_json(
            prompts.seo_prompt(req.topic, req.script),
            system_instruction=prompts.SEO_SYSTEM,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/generate-image")
async def make_image(req: GenerateImageRequest):
    """Actual image generation (not just a prompt) — free via Pollinations by default."""
    try:
        result = await generate_image(req.prompt, req.width, req.height, req.provider)
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
