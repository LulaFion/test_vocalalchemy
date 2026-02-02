from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import os
import subprocess
import sys
import json
import shutil

from ..config import settings
from ..models.library import LibraryAudioMetadata, SaveToLibraryRequest, LibraryAudioFile

router = APIRouter(prefix="/api/library", tags=["library"])

# Library directory path
LIBRARY_DIR = settings.data_dir / "library"


def get_metadata_path(audio_filename: str) -> Path:
    """Get the JSON metadata file path for an audio file."""
    stem = Path(audio_filename).stem
    return LIBRARY_DIR / f"{stem}.json"


def load_metadata(audio_filename: str) -> dict | None:
    """Load metadata from JSON sidecar file if it exists."""
    metadata_path = get_metadata_path(audio_filename)
    if metadata_path.exists():
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    return None


def save_metadata(audio_filename: str, metadata: LibraryAudioMetadata) -> bool:
    """Save metadata to JSON sidecar file."""
    metadata_path = get_metadata_path(audio_filename)
    try:
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata.model_dump(), f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"[Library] Failed to save metadata: {e}")
        return False


@router.get("/list")
async def list_library_audio():
    """
    List all audio files in the library with metadata.
    """
    # Ensure library directory exists
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)

    files = []
    for audio_file in sorted(LIBRARY_DIR.glob("*")):
        if audio_file.suffix.lower() in ['.wav', '.mp3', '.flac', '.ogg', '.m4a']:
            stat = audio_file.stat()
            metadata = load_metadata(audio_file.name)

            files.append({
                "filename": audio_file.name,
                "name": audio_file.stem.replace("_", " ").replace("-", " "),
                "size": stat.st_size,
                "createdAt": stat.st_mtime,
                "metadata": metadata,
            })

    return {"files": files}


@router.get("/audio/{filename}")
async def get_library_audio(filename: str):
    """
    Get a specific audio file from the library.
    """
    audio_path = LIBRARY_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Determine media type
    suffix = audio_path.suffix.lower()
    media_types = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
    }
    media_type = media_types.get(suffix, 'audio/wav')

    # Add CORS headers
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    }

    return FileResponse(
        path=str(audio_path),
        media_type=media_type,
        filename=filename,
        headers=headers
    )


@router.delete("/audio/{filename}")
async def delete_library_audio(filename: str):
    """
    Delete an audio file and its metadata from the library.
    """
    audio_path = LIBRARY_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        # Delete audio file
        os.remove(audio_path)

        # Also delete metadata JSON sidecar if it exists
        metadata_path = get_metadata_path(filename)
        if metadata_path.exists():
            os.remove(metadata_path)

        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@router.post("/save")
async def save_to_library(request: SaveToLibraryRequest):
    """
    Save a generated audio file to the library with metadata.
    Copies the audio from the temp audio directory to the library.
    """
    print(f"[Library] Save request - ref_audio_source: {request.ref_audio_source}")

    # Ensure library directory exists
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)

    # Extract filename from audio_url (e.g., /api/audio/VocalAlchemy_xxx.wav -> VocalAlchemy_xxx.wav)
    source_filename = request.audio_url.split('/')[-1]
    source_path = settings.audio_dir / source_filename

    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Source audio file not found")

    # Target path in library
    target_path = LIBRARY_DIR / request.filename

    # Check if file already exists
    if target_path.exists():
        raise HTTPException(status_code=409, detail="File already exists in library")

    try:
        # Copy audio file to library
        shutil.copy2(source_path, target_path)

        # Create and save metadata
        metadata = LibraryAudioMetadata(
            top_k=request.top_k,
            top_p=request.top_p,
            temperature=request.temperature,
            speed=request.speed,
            duration=request.duration,
            character_id=request.character_id,
            character_name=request.character_name,
            text=request.text,
            text_language=request.text_language,
            ref_audio_source=request.ref_audio_source,
            created_at=datetime.now().isoformat(),
        )
        save_metadata(request.filename, metadata)

        return {
            "success": True,
            "message": "Audio saved to library",
            "filename": request.filename,
        }
    except Exception as e:
        # Clean up if something went wrong
        if target_path.exists():
            os.remove(target_path)
        raise HTTPException(status_code=500, detail=f"Failed to save to library: {str(e)}")


@router.post("/open-folder")
async def open_library_folder():
    """
    Open the library folder in the file explorer.
    """
    # Ensure library directory exists
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)

    try:
        if sys.platform == 'win32':
            os.startfile(str(LIBRARY_DIR))
        elif sys.platform == 'darwin':
            subprocess.run(['open', str(LIBRARY_DIR)])
        else:
            subprocess.run(['xdg-open', str(LIBRARY_DIR)])
        return {"message": "Folder opened"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open folder: {str(e)}")
