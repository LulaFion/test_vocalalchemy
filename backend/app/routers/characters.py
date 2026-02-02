from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path
import uuid
import os

from ..models.character import Character, CharacterCreate, CharacterUpdate
from ..services.character_service import character_service
from ..config import settings

router = APIRouter(prefix="/api/characters", tags=["characters"])


# ==========================================
# Emotion Audio Routes (must be before /{character_id} routes)
# ==========================================

@router.get("/emotion-audio/list")
async def list_emotion_audio():
    """
    List available emotion audio templates organized by gender and language.
    Structure: emotion_audio/{gender}/{language}/{emotion}/audio.wav
    e.g., emotion_audio/Female/zh/calm/孫小美.wav
    """
    emotion_dir = settings.data_dir / "emotion_audio"
    if not emotion_dir.exists():
        return {"genders": []}

    result = {"genders": []}

    # Only include Female and Male folders
    for gender_name in ["Female", "Male"]:
        gender_dir = emotion_dir / gender_name
        if not gender_dir.exists() or not gender_dir.is_dir():
            continue

        gender_data = {
            "name": gender_name,
            "emotions": []  # Actually language categories now (zh, en, etc.)
        }

        # Iterate through language folders (zh, en, etc.)
        for lang_dir in sorted(gender_dir.iterdir()):
            if not lang_dir.is_dir():
                continue

            lang_data = {
                "name": lang_dir.name,  # e.g., "zh", "en"
                "samples": []
            }

            # Collect all audio files from emotion subfolders (calm, dramatic, etc.)
            for emotion_subdir in sorted(lang_dir.iterdir()):
                if not emotion_subdir.is_dir():
                    continue

                for audio_file in sorted(emotion_subdir.glob("*")):
                    if audio_file.suffix.lower() in ['.wav', '.mp3', '.flac']:
                        # Check for matching .txt file with transcript
                        txt_file = audio_file.with_suffix('.txt')
                        transcript = None
                        if txt_file.exists():
                            try:
                                transcript = txt_file.read_text(encoding='utf-8').strip()
                            except Exception:
                                pass

                        sample_data = {
                            "filename": audio_file.name,
                            "name": audio_file.stem.replace("_", " ").replace("template", "").strip(),
                            "emotion": emotion_subdir.name  # Include emotion folder name
                        }
                        if transcript:
                            sample_data["text"] = transcript
                        lang_data["samples"].append(sample_data)

            if lang_data["samples"]:
                gender_data["emotions"].append(lang_data)

        if gender_data["emotions"]:
            result["genders"].append(gender_data)

    return result


@router.get("/emotion-audio/{gender}/{language}/{emotion}/{filename}")
async def get_emotion_audio_4part(gender: str, language: str, emotion: str, filename: str):
    """
    Get a specific emotion audio file for playback (4-part path).
    Path: emotion_audio/{gender}/{language}/{emotion}/{filename}
    e.g., emotion_audio/Female/zh/calm/孫小美.wav
    """
    audio_path = settings.data_dir / "emotion_audio" / gender / language / emotion / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Determine media type
    suffix = audio_path.suffix.lower()
    media_types = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac'
    }
    media_type = media_types.get(suffix, 'audio/wav')

    # Add CORS headers for browser fetch API
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

    return FileResponse(
        path=str(audio_path),
        media_type=media_type,
        filename=filename,
        headers=headers
    )


@router.get("/emotion-audio/{gender}/{emotion}/{filename}")
async def get_emotion_audio(gender: str, emotion: str, filename: str):
    """
    Get a specific emotion audio file for playback (legacy 3-part path).
    Kept for backwards compatibility.
    """
    audio_path = settings.data_dir / "emotion_audio" / gender / emotion / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Determine media type
    suffix = audio_path.suffix.lower()
    media_types = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac'
    }
    media_type = media_types.get(suffix, 'audio/wav')

    # Add CORS headers for browser fetch API
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

    return FileResponse(
        path=str(audio_path),
        media_type=media_type,
        filename=filename,
        headers=headers
    )


@router.get("/character-audio/list/{character_name}")
async def list_character_audio(character_name: str):
    """
    List available reference audio for a specific character.
    Audio files are stored in emotion_audio/{character_name}/ directory.
    """
    audio_dir = settings.data_dir / "emotion_audio" / character_name
    if not audio_dir.exists():
        return {"samples": []}

    samples = []
    for audio_file in sorted(audio_dir.glob("*")):
        if audio_file.suffix.lower() in ['.wav', '.mp3', '.flac']:
            samples.append({
                "filename": audio_file.name,
                "name": audio_file.stem.replace("_", " ").replace("template", "").strip() or audio_file.stem
            })

    return {"samples": samples}


@router.get("/character-audio/{character_name}/{filename}")
async def get_character_audio(character_name: str, filename: str):
    """
    Get a specific character reference audio file for playback.
    """
    audio_path = settings.data_dir / "emotion_audio" / character_name / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Determine media type
    suffix = audio_path.suffix.lower()
    media_types = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac'
    }
    media_type = media_types.get(suffix, 'audio/wav')

    # Add CORS headers for browser fetch API
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

    return FileResponse(
        path=str(audio_path),
        media_type=media_type,
        filename=filename,
        headers=headers
    )


# ==========================================
# Character Routes
# ==========================================

@router.get("", response_model=List[Character])
async def list_characters():
    """Get all characters."""
    return character_service.get_all()


@router.get("/{character_id}", response_model=Character)
async def get_character(character_id: str):
    """Get a character by ID."""
    character = character_service.get_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.post("", response_model=Character)
async def create_character(data: CharacterCreate):
    """Create a new character."""
    return character_service.create(data)


@router.patch("/{character_id}", response_model=Character)
async def update_character(character_id: str, data: CharacterUpdate):
    """Update a character."""
    character = character_service.update(character_id, data)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    return character


@router.delete("/{character_id}")
async def delete_character(character_id: str):
    """Soft delete a character (move to trash). Can be restored within 7 days."""
    success = character_service.delete(character_id)
    if not success:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"message": "Character moved to trash"}


@router.get("/trash/list", response_model=List[Character])
async def list_trash():
    """Get all characters in trash (soft-deleted)."""
    return character_service.get_deleted()


@router.post("/trash/{character_id}/restore", response_model=Character)
async def restore_character(character_id: str):
    """Restore a character from trash."""
    character = character_service.restore(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found in trash")
    return character


@router.delete("/trash/{character_id}/permanent")
async def permanent_delete_character(character_id: str):
    """Permanently delete a character (cannot be recovered)."""
    success = character_service.permanent_delete(character_id)
    if not success:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"message": "Character permanently deleted"}


@router.post("/trash/cleanup")
async def cleanup_trash():
    """Manually trigger cleanup of characters deleted more than 7 days ago."""
    count = character_service.cleanup_old_deleted()
    return {"message": f"Cleaned up {count} old deleted characters"}


@router.post("/{character_id}/reference-audio")
async def upload_reference_audio(character_id: str, file: UploadFile = File(...)):
    """
    Upload a default reference audio file for a character.
    The file will be converted to WAV format and saved.
    Returns the path to the saved file.
    """
    # Check character exists
    character = character_service.get_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Create reference audio directory for character
    ref_dir = settings.data_dir / "reference_audio" / character_id
    ref_dir.mkdir(parents=True, exist_ok=True)

    # Read file content
    content = await file.read()
    original_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".wav"

    # Save original file first
    temp_original = ref_dir / f"temp_original{original_ext}"
    with open(temp_original, "wb") as f:
        f.write(content)

    # Convert to proper WAV format
    output_filename = f"default_{uuid.uuid4().hex[:8]}.wav"
    output_path = ref_dir / output_filename
    converted = False

    # Try soundfile first
    try:
        import soundfile as sf
        import numpy as np

        audio_data, sample_rate = sf.read(str(temp_original))

        # Convert to mono if stereo
        if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
            audio_data = audio_data.mean(axis=1)

        # Ensure float32 and normalize
        audio_data = audio_data.astype(np.float32)
        max_val = np.abs(audio_data).max()
        if max_val > 1.0:
            audio_data = audio_data / max_val

        # Write as PCM_16 WAV
        sf.write(str(output_path), audio_data, sample_rate, subtype='PCM_16')
        converted = True
    except Exception as e:
        print(f"[Characters] Soundfile conversion failed: {e}")

    # Try librosa as fallback
    if not converted:
        try:
            import librosa
            import soundfile as sf

            audio_data, sample_rate = librosa.load(str(temp_original), sr=None, mono=True)
            sf.write(str(output_path), audio_data, sample_rate, subtype='PCM_16')
            converted = True
        except Exception as e:
            print(f"[Characters] Librosa conversion failed: {e}")

    # Clean up temp file
    try:
        os.remove(temp_original)
    except Exception:
        pass

    if not converted:
        raise HTTPException(status_code=400, detail="Failed to convert audio file. Please try a different format.")

    return {"path": str(output_path), "filename": output_filename}


@router.get("/{character_id}/slice-samples")
async def list_slice_samples(character_id: str):
    """
    List available slice samples for a character.
    These are randomly saved audio clips from the training process.
    """
    character = character_service.get_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Check slice_samples directory
    samples_dir = settings.data_dir / "slice_samples" / character.name
    if not samples_dir.exists():
        return {"samples": []}

    # Get all WAV files
    samples = []
    for f in sorted(samples_dir.glob("*.wav")):
        samples.append({
            "filename": f.name,
            "path": str(f),
        })

    return {"samples": samples}


@router.get("/{character_id}/slice-samples/{filename}")
async def get_slice_sample(character_id: str, filename: str):
    """
    Get a specific slice sample audio file for playback.
    """
    character = character_service.get_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Build path to sample file
    sample_path = settings.data_dir / "slice_samples" / character.name / filename
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample not found")

    return FileResponse(
        path=str(sample_path),
        media_type="audio/wav",
        filename=filename
    )
