from fastapi import APIRouter, HTTPException
from app.models import RewriteRequest, SeoRequest
from app.services.llm import generate_text, generate_json
from app.services import prompts

router = APIRouter(prefix="/api/rewrite", tags=["rewrite"])


@router.post("")
async def rewrite_script(req: RewriteRequest):
    try:
        rewritten = await generate_text(
            prompts.rewrite_prompt(req.script, req.notes or ""),
            system_instruction=prompts.REWRITE_SYSTEM,
        )
        rewritten = prompts.strip_markdown(rewritten)
      
        seo = await generate_json(
            prompts.seo_prompt(req.script[:200], rewritten),
            system_instruction=prompts.SEO_SYSTEM,
        )
        return {"rewritten_script": rewritten, "metadata": seo}
    except Exception as e:
        raise HTTPException(500, str(e))
