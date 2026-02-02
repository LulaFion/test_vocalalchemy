from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import characters, synthesis, training, library
from .services.gptsovits_launcher import gptsovits_launcher
from .services.character_service import character_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - start/stop GPT-SoVITS API server."""
    # Startup: Cleanup old deleted characters (7+ days in trash)
    cleaned = character_service.cleanup_old_deleted()
    if cleaned > 0:
        print(f"[VocalAlchemy] Cleaned up {cleaned} old deleted characters from trash")

    # Startup: Launch GPT-SoVITS API server
    print("[VocalAlchemy] Starting GPT-SoVITS API server...")
    gptsovits_launcher.start()

    # Wait for it to be ready (with timeout)
    await gptsovits_launcher.wait_for_ready(timeout=120.0)

    yield  # Application runs here

    # Shutdown: Stop GPT-SoVITS API server
    print("[VocalAlchemy] Shutting down GPT-SoVITS API server...")
    gptsovits_launcher.stop()


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(characters.router)
app.include_router(synthesis.router)
app.include_router(training.router)
app.include_router(library.router)

# Create necessary directories
settings.audio_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
(settings.models_dir / "GPT_weights").mkdir(parents=True, exist_ok=True)
(settings.models_dir / "SoVITS_weights").mkdir(parents=True, exist_ok=True)
(settings.data_dir / "library").mkdir(parents=True, exist_ok=True)

# Static files for audio
app.mount("/api/audio", StaticFiles(directory=str(settings.audio_dir)), name="audio")


@app.get("/")
async def root():
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "gptsovits_url": settings.gptsovits_url,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
