from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModelPaths(BaseModel):
    sovits_model: str
    gpt_model: str
    reference_audio: Optional[str] = None
    reference_text: Optional[str] = None


class Character(BaseModel):
    id: str
    name: str
    status: str = "ready"  # ready, training, failed
    language: str = "en_US"
    audio_minutes: Optional[float] = None
    created_at: str = datetime.now().isoformat()
    avatar_url: Optional[str] = None
    model_paths: Optional[ModelPaths] = None
    version: Optional[str] = None
    deleted_at: Optional[str] = None  # ISO timestamp when soft-deleted, None if active


class CharacterCreate(BaseModel):
    name: str
    language: str = "en_US"
    model_paths: ModelPaths


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    model_paths: Optional[ModelPaths] = None
    avatar_url: Optional[str] = None
