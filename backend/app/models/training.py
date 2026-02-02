from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class TrainingStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PREPROCESSING = "preprocessing"
    SEPARATING_VOCALS = "separating_vocals"
    SLICING = "slicing"
    TRANSCRIBING = "transcribing"
    LABELING = "labeling"  # Waiting for user to review/edit labels
    PREPARING = "preparing"
    TRAINING_GPT = "training_gpt"
    TRAINING_SOVITS = "training_sovits"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioSegment(BaseModel):
    id: str
    filename: str
    filepath: str
    text: str
    language: str
    duration: Optional[float] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None


class LabelUpdate(BaseModel):
    id: str
    text: str
    language: Optional[str] = None


class TrainingProject(BaseModel):
    id: str
    name: str
    language: str
    status: TrainingStatus = TrainingStatus.PENDING
    progress: float = 0.0
    current_step: str = ""
    error: Optional[str] = None

    # Paths
    project_dir: Optional[str] = None
    raw_audio_dir: Optional[str] = None
    vocals_dir: Optional[str] = None
    sliced_dir: Optional[str] = None
    list_file_path: Optional[str] = None  # Path to the .list file for GPT-SoVITS

    # Segments for labeling
    segments: List[AudioSegment] = []

    # Training config - GPT-SoVITS recommended defaults
    gpt_epochs: int = 10
    gpt_batch_size: int = 2
    gpt_save_every: int = 5
    gpt_dpo_training: bool = False

    sovits_epochs: int = 8
    sovits_batch_size: int = 2
    sovits_save_every: int = 4
    sovits_text_lr_weight: float = 0.4  # Text model learning rate weighting

    # Model outputs
    gpt_model_path: Optional[str] = None
    sovits_model_path: Optional[str] = None

    created_at: Optional[str] = None


class TrainingConfig(BaseModel):
    name: str
    language: str = "en"

    # Preprocessing options
    remove_bgm: bool = True
    denoise: bool = True
    auto_slice: bool = True
    auto_transcribe: bool = True

    # Slicing parameters
    slice_threshold: int = -40
    slice_min_length: int = 4000
    slice_min_interval: int = 300
    slice_hop_size: int = 10
    slice_max_sil_kept: int = 500

    # Training parameters - GPT-SoVITS recommended defaults
    gpt_epochs: int = 10
    gpt_batch_size: int = 2
    gpt_save_every: int = 5
    gpt_dpo_training: bool = False

    sovits_epochs: int = 8
    sovits_batch_size: int = 2
    sovits_save_every: int = 4
    sovits_text_lr_weight: float = 0.4


class StartTrainingRequest(BaseModel):
    project_id: str
    # GPT training parameters
    gpt_epochs: Optional[int] = None
    gpt_batch_size: Optional[int] = None
    gpt_save_every: Optional[int] = None
    gpt_dpo_training: Optional[bool] = None
    # SoVITS training parameters
    sovits_epochs: Optional[int] = None
    sovits_batch_size: Optional[int] = None
    sovits_save_every: Optional[int] = None
    sovits_text_lr_weight: Optional[float] = None
