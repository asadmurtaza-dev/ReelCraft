import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")
GROQ_WHISPER_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "imagen-4.0-generate-001")

IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "pollinations") 

if LLM_PROVIDER == "groq" and not GROQ_API_KEY:
    print("[WARN] GROQ_API_KEY not set. Get a free key at https://console.groq.com/keys "
          "and put it in backend/.env")
if LLM_PROVIDER == "gemini" and not GEMINI_API_KEY:
    print("[WARN] GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/apikey "
          "and put it in backend/.env")
