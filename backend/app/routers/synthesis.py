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
from ..config import settings

router = APIRouter(prefix="/api/synthesis", tags=["synthesis"])


def generate_output_filename() -> str:
    """Generate a timestamped filename for synthesized audio."""
    now = datetime.now()
    return f"VocalAlchemy_{now.strftime('%Y%m%d')}_{now.strftime('%H%M%S')}.wav"


def cleanup_session_files():
    """Clean up temporary reference audio files from previous sessions.
    Called on backend startup to remove old ref_*.wav files.
    """
    if not settings.audio_dir.exists():
        return

    # Clean up reference audio files (ref_*.wav and ref_orig_*.*)
    patterns = [
        str(settings.audio_dir / "ref_*.wav"),
        str(settings.audio_dir / "ref_orig_*.*"),
    ]

    cleaned = 0
    for pattern in patterns:
        for filepath in glob.glob(pattern):
            try:
                os.remove(filepath)
                cleaned += 1
            except Exception:
                pass

    if cleaned > 0:
        print(f"[Synthesis] Cleaned up {cleaned} temporary reference audio files from previous session")


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

        # Always convert to proper PCM WAV format
        # GPT-SoVITS uses torchaudio.load() and librosa.load() which need proper WAV format
        converted = False

        # First try soundfile (same backend as torchaudio) - most compatible
        try:
            import soundfile as sf
            import numpy as np

            print(f"[Synthesis] Loading audio with soundfile...")
            audio_data, sample_rate = sf.read(str(temp_original))
            print(f"[Synthesis] Original: {sample_rate}Hz, shape={audio_data.shape}, dtype={audio_data.dtype}")

            # Convert to mono if stereo
            if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
                audio_data = audio_data.mean(axis=1)
                print(f"[Synthesis] Converted stereo to mono")

            # Resample if needed (GPT-SoVITS will handle resampling, but let's normalize)
            # Keep original sample rate - GPT-SoVITS handles resampling internally

            # Ensure float32 format and normalize
            audio_data = audio_data.astype(np.float32)

            # Normalize to prevent clipping
            max_val = np.abs(audio_data).max()
            if max_val > 1.0:
                audio_data = audio_data / max_val

            # Write with soundfile - same format torchaudio uses
            sf.write(str(temp_audio_path), audio_data, sample_rate, subtype='PCM_16')
            converted = True
            print(f"[Synthesis] Soundfile converted successfully: {temp_audio_path} ({sample_rate}Hz)")

            # Clean up original
            try:
                os.remove(temp_original)
            except Exception:
                pass
        except ImportError as e:
            print(f"[Synthesis] Soundfile not available: {e}")
        except Exception as e:
            print(f"[Synthesis] Soundfile conversion failed: {e}")

        # Try librosa as fallback (same library GPT-SoVITS uses)
        if not converted:
            try:
                import librosa
                import numpy as np
                import soundfile as sf

                print(f"[Synthesis] Loading audio with librosa...")
                # librosa.load automatically converts to mono and resamples
                audio_data, sample_rate = librosa.load(str(temp_original), sr=None, mono=True)
                print(f"[Synthesis] Loaded: {sample_rate}Hz, shape={audio_data.shape}")

                # Write with soundfile
                sf.write(str(temp_audio_path), audio_data, sample_rate, subtype='PCM_16')
                converted = True
                print(f"[Synthesis] Librosa+soundfile converted successfully: {temp_audio_path}")

                # Clean up original
                try:
                    os.remove(temp_original)
                except Exception:
                    pass
            except ImportError as e:
                print(f"[Synthesis] Librosa not available: {e}")
            except Exception as e:
                print(f"[Synthesis] Librosa conversion failed: {e}")

        # Try scipy as another fallback
        if not converted:
            try:
                from scipy.io import wavfile
                import numpy as np

                print(f"[Synthesis] Loading audio with scipy...")
                sample_rate, audio_data = wavfile.read(str(temp_original))
                print(f"[Synthesis] Original: {sample_rate}Hz, shape={audio_data.shape}, dtype={audio_data.dtype}")

                # Convert to float for processing
                if audio_data.dtype == np.int16:
                    audio_float = audio_data.astype(np.float32) / 32768.0
                elif audio_data.dtype == np.int32:
                    audio_float = audio_data.astype(np.float32) / 2147483648.0
                elif audio_data.dtype == np.float32 or audio_data.dtype == np.float64:
                    audio_float = audio_data.astype(np.float32)
                else:
                    audio_float = audio_data.astype(np.float32)

                # Convert stereo to mono
                if len(audio_float.shape) > 1 and audio_float.shape[1] > 1:
                    audio_float = audio_float.mean(axis=1)
                    print(f"[Synthesis] Converted stereo to mono")

                # Convert back to int16
                audio_int16 = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)

                # Write with scipy
                wavfile.write(str(temp_audio_path), sample_rate, audio_int16)
                converted = True
                print(f"[Synthesis] Scipy converted to PCM WAV successfully: {temp_audio_path}")

                # Clean up original
                try:
                    os.remove(temp_original)
                except Exception:
                    pass
            except ImportError as e:
                print(f"[Synthesis] Scipy not available: {e}")
            except Exception as e:
                print(f"[Synthesis] Scipy conversion failed: {e}")

        # If still not converted, use original file
        if not converted:
            print(f"[Synthesis] Using original file (may not work with GPT-SoVITS)")
            temp_audio_path = temp_original

        ref_audio_path = str(temp_audio_path)
        # Validate converted audio
        try:
            import soundfile as sf
            ref_data, ref_sr = sf.read(ref_audio_path)
            ref_duration = len(ref_data) / ref_sr
            print(f"[Synthesis] Final reference audio: {ref_audio_path}")
            print(f"[Synthesis]   Size: {os.path.getsize(ref_audio_path)} bytes")
            print(f"[Synthesis]   Sample rate: {ref_sr}Hz, Duration: {ref_duration:.2f}s, Samples: {len(ref_data)}")
            if ref_duration < 3 or ref_duration > 10:
                print(f"[Synthesis] WARNING: Reference audio duration ({ref_duration:.2f}s) outside optimal range (3-10s)")
        except Exception as e:
            print(f"[Synthesis] Could not validate reference audio: {e}")
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
