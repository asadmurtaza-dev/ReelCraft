# Reelcraft — From Idea to Upload, One Studio

Agentic toolkit for building and running a YouTube channel:

1. **Channel naming & branding** — works from a niche you already have, or helps you find one
2. **Long-form video pipeline** — script → scene breakdown → image prompts → actual generated images → video-gen prompts → SEO metadata, with independent agents running concurrently
3. **Script rewrite/optimizer** — tightens an existing script, regenerates fresh metadata
4. **Video → script extraction** — paste a link (YouTube captions when available, audio+Whisper otherwise) or upload a file
5. **Auto Mode** — one free-form message (Roman Urdu / Urdu / English) plans and runs whichever of the above are needed

## Stack
- **Backend:** Python, FastAPI
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind
- **LLM:** Groq (free tier, default) — text generation, JSON structured output,
  planning/orchestration, and Whisper transcription. Gemini is wired in as an
  alternate provider if you'd rather use it (see Troubleshooting).
- **Images:** Pollinations.ai (free, no API key) by default; can switch to
  Gemini/Imagen for higher quality
- **Link transcription:** `youtube-transcript-api` (captions) with `yt-dlp`
  (audio download) as a fallback when captions aren't available

## 1. Get a free API key
**Recommended: Groq** — https://console.groq.com/keys (no credit card, fast, and
doesn't have the key-format problems Gemini is currently rolling out — see
Troubleshooting below).

Alternative: **Gemini** — https://aistudio.google.com/apikey. Only use this if
your key starts with the older `AIzaSy...` format; Google's newer `AQ.` format
keys are broken for many accounts right now.

## 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# open .env: leave LLM_PROVIDER=groq and paste your GROQ_API_KEY
# (or set LLM_PROVIDER=gemini and paste GEMINI_API_KEY instead)
uvicorn app.main:app --reload --port 8000
```
Backend now runs at http://localhost:8000 (docs at /docs).

## 3. Frontend setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
Frontend runs at http://localhost:3000.

## Project layout
```
backend/
  app/
    main.py                 FastAPI app + router wiring
    config.py                env/config loading (LLM_PROVIDER, model names, image provider)
    models.py                 request/response schemas
    services/
      llm.py                    provider-agnostic dispatcher — routers call this, not a provider directly
      groq_client.py             Groq (default) — chat + JSON + Whisper, with 429 wait-and-retry
      gemini.py                   Gemini (alternate) — same functions, different backend
      images.py                    Pollinations / Gemini image generation
      prompts.py                    every agent's system prompt + prompt builder, in one place
      transcript_format.py           cleans a raw transcript of any length, in chunks
      link_transcript.py              captions-first, audio-fallback transcript from a URL
    routers/
      naming.py                 Section 1 — channel naming/branding (has-niche or find-a-niche mode)
      pipeline.py                Section 2 — script/scenes/image+video prompts/images/seo
      rewrite.py                   Section 3 — script rewrite + fresh metadata
      transcribe.py                  Section 4 — file upload or link -> script
      orchestrator.py                  Auto Mode — plans, then runs independent agents concurrently

frontend/
  app/
    page.tsx                overview/home, with a prompt bar that hands off to Auto Mode
    naming/page.tsx           Section 1 UI
    pipeline/page.tsx          Section 2 UI — live agent-status cards, paced image loading with retry
    rewrite/page.tsx             Section 3 UI
    transcribe/page.tsx            Section 4 UI — link or upload tabs
    auto/page.tsx                    Auto Mode UI — persistent chat
  components/                       shared UI (Panel/Button/etc) + responsive sidebar
  lib/
    api.ts                            typed fetch client for the backend
    text.ts                            strips stray markdown from script text client-side
```

## How Auto Mode works
1. User sends one free-form message.
2. `orchestrator.py` sends it to the configured LLM provider with a *planning-only*
   system prompt — it returns JSON: which tasks are needed (naming/script/rewrite/
   images/seo) and any extracted parameters (topic, tone, length, pasted script).
3. The backend then actually runs those agents. Independent ones run concurrently
   (naming runs alongside everything else; once a script exists, SEO and the
   scenes→image-prompts→images branch run side by side since neither needs the
   other's output).
4. Everything comes back together as one package.

## Notes for the hackathon demo
- Pollinations needs no key and no signup, but its free anonymous tier allows
  roughly one image every ~15 seconds per IP — the pipeline page generates
  images one at a time with a paced queue and an automatic + manual retry per
  scene, so a single failed image never blocks the rest. A 6-image scene set
  takes ~1.5–2 minutes; that's the free tier, not a bug.
- Video upload is capped at 50MB in `transcribe.py` to keep demo requests fast.
  Link-based audio transcription is capped at ~24MB of audio (Groq's Whisper
  upload limit) — a YouTube link with captions has no such limit since it never
  downloads anything.
- All prompt templates live in one file (`services/prompts.py`) so judges can
  see the full agent design at a glance. `strip_markdown()` in the same file is
  a safety net: scripts are read aloud / shown in a plain textbox, so any
  stray `**bold**`/`*italic*` the model adds is stripped server-side.
- Groq's free tier has a tokens-per-minute cap; `groq_client.py` automatically
  waits and retries on a 429 rather than failing the request.

## Troubleshooting: Gemini errors (404 / 401 / key not working)
Google is mid-rollout on a new API key format: newer keys from AI Studio start
with `AQ.` instead of the older `AIzaSy...`, and for a large number of accounts
these new keys simply don't authenticate against the REST API yet — no known
user-side fix, Google's own guidance is to submit a compatibility report and
wait. If that's what you're hitting, the fastest way to keep moving is:

```bash
# backend/.env
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_from_console.groq.com/keys
```
No other code changes needed — every router already calls through
`services/llm.py`, which just routes to whichever provider is configured.

If you'd rather keep using Gemini and your key is the older `AIzaSy...` format:
1. Set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env`.
2. If you get a 404, check the current model list — Google retires Gemini
   versions on a rolling schedule (e.g. `gemini-2.0-flash` was shut down
   1 June 2026) — and update `GEMINI_TEXT_MODEL` in `.env` to a live one:
   https://ai.google.dev/gemini-api/docs/models

## Troubleshooting: link transcription
- **"Couldn't download audio from this link"** — the video may be private,
  age-restricted, or region-locked. Try a different link or the Upload tab.
- If YouTube downloads start failing across the board, `yt-dlp` is usually the
  cause (YouTube changes things often) — update it: `pip install -U yt-dlp`.
- A YouTube link with no captions falls back to downloading audio, so it's
  slower than a captioned link — this is expected, not an error.
