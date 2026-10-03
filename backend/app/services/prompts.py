"""Central place for every agent's system instruction + prompt builder."""
import re


def strip_markdown(text: str) -> str:
    """Safety net: some models add **bold**/*italic*/# headers even when told
    not to. Scripts are shown in a plain textbox, so raw markdown symbols show
    up literally — strip them here regardless of what the model did."""
    if not text:
        return text
    text = re.sub(r"\*\*\*(.*?)\*\*\*", r"\1", text)  
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)      
    text = re.sub(r"(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)", r"\1", text)  
    text = re.sub(r"__(.*?)__", r"\1", text)          
    text = re.sub(r"(?<!_)_(?!_)(.*?)(?<!_)_(?!_)", r"\1", text)        
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.MULTILINE)   
    text = re.sub(r"^\s*[-*]\s+", "", text, flags=re.MULTILINE)        
    text = re.sub(r"[ \t]+\n", "\n", text)            
    return text.strip()

# Channel naming & branding 
NAMING_SYSTEM = (
    "You are a YouTube channel branding strategist. You handle two kinds of "
    "creators: some already know their niche and just need naming help; others "
    "don't have a niche yet and need help finding one based on their interests, "
    "skills, or experience. Names you propose are memorable, easy to spell/search, "
    "and not already generic. Respond ONLY in valid JSON."
)

def naming_prompt(description: str, has_niche: bool = True) -> str:
    if has_niche:
        return f"""Creator's description of their planned channel: "{description}"

Return JSON with this exact shape:
{{
  "niche_options": [],
  "recommended_niche": "a one-line restatement of their niche",
  "names": [
    {{"name": "...", "why_it_works": "...", "handle_suggestion": "@..."}}
  ],
  "tagline_options": ["...", "...", "..."],
  "channel_description": "a 2-3 sentence YouTube 'About' section",
  "content_pillars": ["3-5 recurring content themes this channel should post"]
}}
Give exactly 6 name options, ordered from safest to boldest. Leave niche_options
as an empty array — the creator already knows their niche."""

    return f"""This creator does NOT have a niche picked yet. Here's what they told you
about themselves — interests, skills, experience, personality, or anything else
they shared: "{description}"

First, propose 3-4 realistic YouTube niche directions for them, each with a short
reason it could work (audience demand, how saturated it is, monetization potential,
fit with what they described). Then pick the strongest one and build a full naming
package around it, the same way you would if they'd told you their niche directly.

Return JSON with this exact shape:
{{
  "niche_options": [
    {{"niche": "...", "why": "1-2 sentences on audience/competition/fit"}}
  ],
  "recommended_niche": "the niche you picked to build names around, and briefly why",
  "names": [
    {{"name": "...", "why_it_works": "...", "handle_suggestion": "@..."}}
  ],
  "tagline_options": ["...", "...", "..."],
  "channel_description": "a 2-3 sentence YouTube 'About' section",
  "content_pillars": ["3-5 recurring content themes this channel should post"]
}}
Give exactly 3-4 niche_options and exactly 6 name options for the recommended one."""


# Long-form video pipeline 
SCRIPT_SYSTEM = (
    "You are a senior YouTube scriptwriter who writes for high retention: "
    "strong hooks in the first 15 seconds, pattern interrupts, clear "
    "structure, and a natural spoken voice (not an essay). This script will "
    "be read aloud by a narrator, not displayed as a formatted document — "
    "write it as PLAIN TEXT ONLY. Do not use markdown of any kind: no "
    "asterisks, no **bold**, no *italics*, no bullet points, no # headers. "
    "Section labels should be plain words in ALL CAPS on their own line "
    "(e.g. HOOK, INTRO, OUTRO), never wrapped in symbols."
)

def script_prompt(topic: str, length_minutes: int, tone: str) -> str:
    return f"""Write a full YouTube video script.
Topic: {topic}
Target length: ~{length_minutes} minutes spoken
Tone: {tone}

Structure it with clear labeled sections: HOOK, INTRO, [main body sections with
descriptive headers], and OUTRO with a call to action. Write it as if narrated
directly to camera. Do not include camera directions inline — just the spoken
words, organized under section headers."""


SCENES_SYSTEM = (
    "You break finished scripts into a numbered shot/scene list for video "
    "production. You are precise and production-minded. Respond ONLY in valid JSON."
)

def scenes_prompt(script: str) -> str:
    return f"""Break this script into scenes for filming/editing.

SCRIPT:
{script}

Return JSON:
{{
  "scenes": [
    {{
      "scene_number": 1,
      "script_excerpt": "the portion of the script this scene covers (short)",
      "visual_description": "what should be on screen",
      "suggested_duration_seconds": 8
    }}
  ]
}}"""


IMAGE_PROMPT_SYSTEM = (
    "You are a visual director who converts scene descriptions into vivid, "
    "specific text-to-image prompts (style, lighting, composition, mood). "
    "Respond ONLY in valid JSON."
)

def image_prompts_prompt(scenes_json: str) -> str:
    return f"""Given these scenes:
{scenes_json}

Return JSON:
{{
  "image_prompts": [
    {{"scene_number": 1, "prompt": "a single detailed text-to-image prompt, no camera jargon, ready to send to an image generator"}}
  ]
}}"""


VIDEO_PROMPT_SYSTEM = (
    "You write prompts for AI video generation tools (Runway, Kling, Sora-style). "
    "You describe motion, camera movement, and duration explicitly. "
    "Respond ONLY in valid JSON."
)

def video_prompts_prompt(scenes_json: str) -> str:
    return f"""Given these scenes:
{scenes_json}

Return JSON:
{{
  "video_prompts": [
    {{"scene_number": 1, "prompt": "a text-to-video prompt including camera movement and motion, 5-10 seconds"}}
  ]
}}"""


SEO_SYSTEM = (
    "You are a YouTube SEO specialist who understands the algorithm, "
    "click-through rate psychology, and keyword research. "
    "Respond ONLY in valid JSON."
)

def seo_prompt(topic: str, script: str) -> str:
    return f"""Topic: {topic}

SCRIPT (for context):
{script[:3000]}

Return JSON:
{{
  "titles": ["5 title options under 60 characters, high CTR"],
  "description": "an SEO-optimized YouTube description with natural keyword placement, 150-300 words, include 2-3 relevant hashtags at the end",
  "tags": ["15-20 relevant search tags"],
  "thumbnail_text_ideas": ["3-5 short punchy phrases (2-5 words) for thumbnail overlay text"],
  "pinned_comment_suggestion": "a short engagement-bait comment idea to pin"
}}"""


# Rewrite / optimize existing script
REWRITE_SYSTEM = (
    "You are a script doctor. You take an existing YouTube script and rewrite "
    "it for better retention, pacing, and clarity while preserving the "
    "creator's original ideas and voice as much as possible. This script will "
    "be read aloud by a narrator — write it as PLAIN TEXT ONLY. Do not use "
    "markdown of any kind: no asterisks, no **bold**, no *italics*, no bullet "
    "points, no # headers. Section labels should be plain words in ALL CAPS "
    "on their own line, never wrapped in symbols."
)

def rewrite_prompt(original_script: str, notes: str) -> str:
    extra = f"\nCreator's specific notes/requests: {notes}" if notes else ""
    return f"""Rewrite and improve this YouTube script. Strengthen the hook, tighten
pacing, add pattern interrupts where it drags, and clean up any rambling —
but keep the creator's core message and voice.{extra}

ORIGINAL SCRIPT:
{original_script}

Return only the rewritten script, organized under section headers
(HOOK, INTRO, main sections, OUTRO)."""


# Orchestrator 
ORCHESTRATOR_SYSTEM = (
    "You are the planning agent for 'Reelcraft', a YouTube creator toolkit. "
    "A user will describe what they want in one free-form message, possibly "
    "in Roman Urdu, Urdu, or English. Decide which of these tasks are needed: "
    "'naming' (channel name/branding), 'script' (write a new script), "
    "'seo' (title/description/tags), 'images' (generate/describe scene images), "
    "'rewrite' (improve an existing pasted script). "
    "Respond ONLY in valid JSON describing an execution plan — do not perform "
    "the tasks yourself."
)

def orchestrator_plan_prompt(user_message: str) -> str:
    return f"""User request: "{user_message}"

Return JSON:
{{
  "summary": "one line describing what the user wants, in the same language they used",
  "tasks": ["ordered list, any of: naming, script, seo, images, rewrite"],
  "extracted": {{
    "channel_description": "if relevant, else null",
    "video_topic": "if relevant, else null",
    "existing_script": "if the user pasted a script to rewrite, else null",
    "length_minutes": "a number if relevant, else null",
    "tone": "a short tone descriptor if relevant, else null"
  }}
}}"""
