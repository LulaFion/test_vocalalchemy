from pydantic import BaseModel
from typing import Optional


class LibraryAudioMetadata(BaseModel):
    """Metadata for a saved audio file in the library."""
    # Synthesis parameters
    top_k: int = 5
    top_p: float = 1.0
    temperature: float = 1.0
    speed: float = 1.0

    # Audio info
    duration: Optional[float] = None  # Duration in seconds

    # Character and text info
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    text: Optional[str] = None
    text_language: Optional[str] = None

    # Reference audio source
    ref_audio_source: Optional[str] = None  # e.g., "emotion:Male/Happy/happy_01.wav" or "character:Xixi/greeting.wav" or "upload:custom.wav"

    # Timestamp
    created_at: Optional[str] = None


class SaveToLibraryRequest(BaseModel):
    """Request to save audio to library."""
    audio_url: str  # URL of the generated audio (e.g., /api/audio/VocalAlchemy_xxx.wav)
    filename: str  # Target filename (e.g., Xixi_你好世界.wav)

    # Synthesis parameters
    top_k: int = 5
    top_p: float = 1.0
    temperature: float = 1.0
    speed: float = 1.0

    # Audio info
    duration: Optional[float] = None

    # Character and text info
    character_id: Optional[str] = None
    character_name: Optional[str] = None
    text: Optional[str] = None
    text_language: Optional[str] = None

    # Reference audio source
    ref_audio_source: Optional[str] = None  # e.g., "emotion:Male/Happy/happy_01.wav" or "character:Xixi/greeting.wav" or "upload:custom.wav"


class LibraryAudioFile(BaseModel):
    """Library audio file with metadata."""
    filename: str
    name: str
    size: Optional[int] = None
    created_at: Optional[float] = None

    # Metadata from JSON sidecar (if exists)
    metadata: Optional[LibraryAudioMetadata] = None
