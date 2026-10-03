from fastapi import APIRouter, HTTPException
from app.models import NamingRequest
from app.services.llm import generate_json
from app.services import prompts

router = APIRouter(prefix="/api/naming", tags=["naming"])


@router.post("")
async def get_channel_names(req: NamingRequest):
    try:
        result = await generate_json(
            prompts.naming_prompt(req.description, req.has_niche),
            system_instruction=prompts.NAMING_SYSTEM,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
