import asyncio
import json
from fastapi import APIRouter, HTTPException
from app.models import OrchestratorRequest
from app.services.llm import generate_text, generate_json
from app.services.images import generate_image
from app.services import prompts

router = APIRouter(prefix="/api/auto", tags=["orchestrator"])


async def _run_naming(req_message: str, extracted: dict) -> dict:
    return await generate_json(
        prompts.naming_prompt(extracted.get("channel_description") or req_message),
        system_instruction=prompts.NAMING_SYSTEM,
    )


async def _run_seo(topic: str, script_text: str) -> dict:
    return await generate_json(
        prompts.seo_prompt(topic, script_text),
        system_instruction=prompts.SEO_SYSTEM,
    )


async def _run_images_branch(script_text: str) -> dict:
    """scenes -> image prompts -> actual images, with the image-generation calls
    themselves fanned out in parallel."""
    scenes = await generate_json(
        prompts.scenes_prompt(script_text),
        system_instruction=prompts.SCENES_SYSTEM,
    )
    img_prompts = await generate_json(
        prompts.image_prompts_prompt(json.dumps(scenes)),
        system_instruction=prompts.IMAGE_PROMPT_SYSTEM,
    )
    prompt_list = img_prompts.get("image_prompts", [])[:6]  

    async def _one(p):
        img = await generate_image(p["prompt"])
        return {"scene_number": p.get("scene_number"), "prompt": p["prompt"], **img}

    images = await asyncio.gather(*(_one(p) for p in prompt_list))
    return {"scenes": scenes, "images": list(images)}


@router.post("")
async def auto_run(req: OrchestratorRequest):
    """
    One free-form prompt in -> planner agent decides which sub-agents to run ->
    independent agents run concurrently (e.g. naming + script/rewrite start
    together; once a script exists, SEO and the image branch run side by side
    since neither depends on the other) -> combined package back out.
    """
    try:
        plan = await generate_json(
            prompts.orchestrator_plan_prompt(req.message),
            system_instruction=prompts.ORCHESTRATOR_SYSTEM,
        )
    except Exception as e:
        raise HTTPException(500, f"Planning step failed: {e}")

    tasks = plan.get("tasks", [])
    extracted = plan.get("extracted", {}) or {}
    results = {"plan": plan, "outputs": {}}

    topic = extracted.get("video_topic") or req.message
    length_minutes = extracted.get("length_minutes") or 8
    tone = extracted.get("tone") or "conversational, energetic"
    script_text = extracted.get("existing_script")

    try:
     
        naming_task = asyncio.create_task(_run_naming(req.message, extracted)) if "naming" in tasks else None

        if "rewrite" in tasks and script_text:
            rewritten = await generate_text(
                prompts.rewrite_prompt(script_text, ""),
                system_instruction=prompts.REWRITE_SYSTEM,
            )
            rewritten = prompts.strip_markdown(rewritten)
            results["outputs"]["rewrite"] = {"rewritten_script": rewritten}
            script_text = rewritten 

        if "script" in tasks and not script_text:
            script_text = await generate_text(
                prompts.script_prompt(topic, length_minutes, tone),
                system_instruction=prompts.SCRIPT_SYSTEM,
            )
            script_text = prompts.strip_markdown(script_text)
            results["outputs"]["script"] = script_text

        if script_text and ("seo" in tasks or "images" in tasks):
            seo_task = asyncio.create_task(_run_seo(topic, script_text)) if "seo" in tasks else None
            images_task = asyncio.create_task(_run_images_branch(script_text)) if "images" in tasks else None

            if seo_task:
                results["outputs"]["seo"] = await seo_task
            if images_task:
                branch = await images_task
                results["outputs"]["scenes"] = branch["scenes"]
                results["outputs"]["images"] = branch["images"]

        if naming_task:
            results["outputs"]["naming"] = await naming_task

    except Exception as e:
        raise HTTPException(500, f"Execution step failed: {e}")

    return results
