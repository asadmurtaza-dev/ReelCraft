from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import naming, pipeline, rewrite, transcribe, orchestrator

app = FastAPI(title="Reelcraft API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(naming.router)
app.include_router(pipeline.router)
app.include_router(rewrite.router)
app.include_router(transcribe.router)
app.include_router(orchestrator.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
