from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from typing import Optional
from datetime import datetime
import uuid
import os
import glob

from ..models.synthesis import SynthesisRequest, SynthesisResponse
from ..services.character_service import character_service
from ..services.gptsovits_service import gptsovits_service
from ..services.gptsovits_launcher import gptsovits_launcher
from ..services.audio_utils import convert_audio_to_wav, get_audio_info, validate_reference_audio
from ..config import settings

router = APIRouter(prefix="/api/synthesis", tags=["synthesis"])


def generate_output_filename() -> str:
    """Generate a timestamped filename for synthesized audio."""
    now = datetime.now()
    return f"VocalAlchemy_{now.strftime('%Y%m%d')}_{now.strftime('%H%M%S')}.wav"


def cleanup_session_files():
    """Clean up temporary and old audio files from previous sessions.
    Called on backend startup to:
    - Remove all ref_*.wav and ref_orig_*.* files (temporary reference audio)
    - Remove VocalAlchemy_*.wav files older than 24 hours (generated audio)
    """
    import time

    if not settings.audio_dir.exists():
        return

    # Clean up reference audio files (ref_*.wav and ref_orig_*.*)
    ref_patterns = [
        str(settings.audio_dir / "ref_*.wav"),
        str(settings.audio_dir / "ref_orig_*.*"),
    ]

    ref_cleaned = 0
    for pattern in ref_patterns:
        for filepath in glob.glob(pattern):
            try:
                os.remove(filepath)
                ref_cleaned += 1
            except Exception:
                pass

    if ref_cleaned > 0:
        print(f"[Synthesis] Cleaned up {ref_cleaned} temporary reference audio files")

    # Clean up generated audio files older than 24 hours
    cutoff_time = time.time() - (24 * 60 * 60)  # 24 hours ago
    generated_pattern = str(settings.audio_dir / "VocalAlchemy_*.wav")

    gen_cleaned = 0
    for filepath in glob.glob(generated_pattern):
        try:
            file_mtime = os.path.getmtime(filepath)
            if file_mtime < cutoff_time:
                os.remove(filepath)
                gen_cleaned += 1
        except Exception:
            pass

    if gen_cleaned > 0:
        print(f"[Synthesis] Cleaned up {gen_cleaned} generated audio files older than 24 hours")


# Run cleanup on module import (backend startup)
cleanup_session_files()


@router.get("/health")
async def check_gptsovits_health():
    """Check if GPT-SoVITS API is running."""
    is_healthy = await gptsovits_service.check_health()
    process_running = gptsovits_launcher.is_running()
    return {
        "gptsovits_running": is_healthy,
        "gptsovits_process": process_running,
        "gptsovits_url": settings.gptsovits_url
    }


@router.post("/gptsovits/restart")
async def restart_gptsovits():
    """Restart the GPT-SoVITS API server."""
    gptsovits_launcher.stop()
    success = gptsovits_launcher.start()
    if success:
        ready = await gptsovits_launcher.wait_for_ready(timeout=60.0)
        return {"success": ready, "message": "GPT-SoVITS restarted" if ready else "Failed to restart"}
    return {"success": False, "message": "Failed to start GPT-SoVITS"}


@router.post("", response_model=SynthesisResponse)
async def synthesize(
    text: str = Form(...),
    text_lang: str = Form("en"),
    character_id: str = Form(...),
    top_k: int = Form(5),
    top_p: float = Form(1.0),
    temperature: float = Form(0.8),
    speed_factor: float = Form(1.0),
    ref_audio_file: Optional[UploadFile] = File(None),
    ref_audio_text: Optional[str] = Form(None),
    ref_audio_lang: Optional[str] = Form(None),
):
    """
    Synthesize speech for the given text using a character's voice.
    Accepts optional reference audio file upload for voice cloning.
    Returns the path to the generated audio file.
    """
    # Debug: print request info
    print(f"[Synthesis] === Request Received ===")
    print(f"[Synthesis] text: {text[:50]}..." if len(text) > 50 else f"[Synthesis] text: {text}")
    print(f"[Synthesis] text_lang: {text_lang}")
    print(f"[Synthesis] character_id: {character_id}")
    print(f"[Synthesis] ref_audio_file: {ref_audio_file.filename if ref_audio_file else 'None'}")
    print(f"[Synthesis] ref_audio_text: {ref_audio_text}")
    print(f"[Synthesis] ref_audio_lang: {ref_audio_lang}")
    # Get character
    character = character_service.get_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not character.model_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Character '{character.name}' has no models configured"
        )

    # Handle reference audio
    ref_audio_path = None
    temp_audio_path = None

    if ref_audio_file and ref_audio_file.filename:
        # Save uploaded reference audio to temp location
        # Convert to WAV PCM format that GPT-SoVITS can read
        settings.audio_dir.mkdir(parents=True, exist_ok=True)
        temp_audio_path = settings.audio_dir / f"ref_{uuid.uuid4().hex[:8]}.wav"

        content = await ref_audio_file.read()
        original_ext = os.path.splitext(ref_audio_file.filename)[1].lower()

        # Save original file first
        temp_original = settings.audio_dir / f"ref_orig_{uuid.uuid4().hex[:8]}{original_ext}"
        with open(temp_original, "wb") as f:
            f.write(content)

        print(f"[Synthesis] Saved original file: {temp_original} ({len(content)} bytes)")

        # Convert to proper PCM WAV format using shared utility
        converted, error = convert_audio_to_wav(temp_original, temp_audio_path, delete_original=True)

        if converted:
            print(f"[Synthesis] Audio converted successfully: {temp_audio_path}")
            ref_audio_path = str(temp_audio_path)

            # Validate converted audio
            info = get_audio_info(temp_audio_path)
            if info:
                print(f"[Synthesis] Final reference audio: {ref_audio_path}")
                print(f"[Synthesis]   Size: {info['size_bytes']} bytes")
                print(f"[Synthesis]   Sample rate: {info['sample_rate']}Hz, Duration: {info['duration']:.2f}s")

                is_valid, warning = validate_reference_audio(temp_audio_path)
                if warning:
                    print(f"[Synthesis] WARNING: {warning}")
        else:
            print(f"[Synthesis] Audio conversion failed: {error}")
            print(f"[Synthesis] Using original file (may not work with GPT-SoVITS)")
            ref_audio_path = str(temp_original)
    elif character.model_paths.reference_audio:
        # Use character's default reference audio
        ref_audio_path = character.model_paths.reference_audio

    # Determine reference text and language
    prompt_text = ref_audio_text if ref_audio_text else (character.model_paths.reference_text or "")
    prompt_lang = ref_audio_lang if ref_audio_lang else character.language

    # Synthesize
    success, message, audio_bytes = await gptsovits_service.synthesize(
        character=character,
        text=text,
        text_lang=text_lang,
        top_k=top_k,
        top_p=top_p,
        temperature=temperature,
        speed_factor=speed_factor,
        ref_audio_path=ref_audio_path,
        prompt_text=prompt_text,
        prompt_lang=prompt_lang,
    )

    # Note: Reference audio is kept for the session (not deleted after each synthesis)
    # Cleanup happens on backend restart via cleanup_session_files()

    if not success:
        return SynthesisResponse(success=False, message=message)

    # Validate audio bytes - minimum threshold for valid audio
    # A WAV header is 44 bytes, so anything less than ~1KB is definitely invalid
    # Short phrases (1-2 seconds) can be 10-30KB, so use 5KB as minimum
    if not audio_bytes or len(audio_bytes) < 5000:
        print(f"[Synthesis] WARNING: Generated audio is too small ({len(audio_bytes) if audio_bytes else 0} bytes)")
        print(f"[Synthesis] This usually means GPT-SoVITS failed to generate proper audio.")
        print(f"[Synthesis] Check if the reference audio and text are correct.")
        return SynthesisResponse(
            success=False,
            message=f"Generation failed: Audio output is too short ({len(audio_bytes) if audio_bytes else 0} bytes). Try a different reference audio or check the reference text."
        )

    print(f"[Synthesis] Generated audio size: {len(audio_bytes)} bytes")

    # Save audio and return URL
    filename = generate_output_filename()
    filepath = await gptsovits_service.save_audio(audio_bytes, filename)

    return SynthesisResponse(
        success=True,
        message="Synthesis successful",
        audio_url=f"/api/audio/{filename}"
    )


@router.post("/json", response_model=SynthesisResponse)
async def synthesize_json(request: SynthesisRequest):
    """
    Synthesize speech using JSON request (uses character's default reference audio).
    """
    # Get character
    character = character_service.get_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not character.model_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Character '{character.name}' has no models configured"
        )

    # Synthesize using character's default reference
    success, message, audio_bytes = await gptsovits_service.synthesize(
        character=character,
        text=request.text,
        text_lang=request.text_lang,
        top_k=request.top_k,
        top_p=request.top_p,
        temperature=request.temperature,
        speed_factor=request.speed_factor,
        text_split_method=request.text_split_method,
        seed=request.seed,
    )

    if not success:
        return SynthesisResponse(success=False, message=message)

    # Validate audio bytes - minimum threshold for valid audio
    # Short phrases (1-2 seconds) can be 10-30KB, so use 5KB as minimum
    if not audio_bytes or len(audio_bytes) < 5000:
        print(f"[Synthesis JSON] WARNING: Generated audio is too small ({len(audio_bytes) if audio_bytes else 0} bytes)")
        return SynthesisResponse(
            success=False,
            message=f"Generation failed: Audio output is too short ({len(audio_bytes) if audio_bytes else 0} bytes). Try a different reference audio or check the reference text."
        )

    print(f"[Synthesis JSON] Generated audio size: {len(audio_bytes)} bytes")

    # Save audio and return URL
    filename = generate_output_filename()
    filepath = await gptsovits_service.save_audio(audio_bytes, filename)

    return SynthesisResponse(
        success=True,
        message="Synthesis successful",
        audio_url=f"/api/audio/{filename}"
    )


@router.post("/stream")
async def synthesize_stream(request: SynthesisRequest):
    """
    Synthesize speech and return audio bytes directly.
    Useful for streaming playback.
    """
    # Get character
    character = character_service.get_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    if not character.model_paths:
        raise HTTPException(
            status_code=400,
            detail=f"Character '{character.name}' has no models configured"
        )

    # Synthesize
    success, message, audio_bytes = await gptsovits_service.synthesize(
        character=character,
        text=request.text,
        text_lang=request.text_lang,
        top_k=request.top_k,
        top_p=request.top_p,
        temperature=request.temperature,
        speed_factor=request.speed_factor,
        text_split_method=request.text_split_method,
        seed=request.seed,
    )

    if not success:
        raise HTTPException(status_code=500, detail=message)

    return Response(content=audio_bytes, media_type="audio/wav")


@router.get("/audio/{filename}")
async def get_audio(filename: str):
    """Serve generated audio files."""
    filepath = settings.audio_dir / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(filepath, media_type="audio/wav")
