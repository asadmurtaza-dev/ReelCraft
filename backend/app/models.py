from pydantic import BaseModel
from typing import Optional, List

class NamingRequest(BaseModel):
    description: str
    has_niche: bool = True

class ScriptRequest(BaseModel):
    topic: str
    length_minutes: int = 8
    tone: str = "conversational, energetic"

class ScenesRequest(BaseModel):
    script: str

class ImagePromptsRequest(BaseModel):
    scenes: list

class VideoPromptsRequest(BaseModel):
    scenes: list

class SeoRequest(BaseModel):
    topic: str
    script: str

class GenerateImageRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 576
    provider: Optional[str] = None

class RewriteRequest(BaseModel):
    script: str
    notes: Optional[str] = ""

class OrchestratorRequest(BaseModel):
    message: str

class TranscribeLinkRequest(BaseModel):
    url: str