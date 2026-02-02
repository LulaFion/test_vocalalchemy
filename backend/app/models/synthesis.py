from pydantic import BaseModel
from typing import Optional, Union


class SynthesisRequest(BaseModel):
    text: str
    text_lang: str = "en"
    character_id: str

    # Optional synthesis parameters
    top_k: int = 5
    top_p: float = 1.0
    temperature: float = 1.0
    speed_factor: float = 1.0

    # Advanced options
    text_split_method: str = "cut5"
    batch_size: int = 1
    seed: int = -1
    media_type: str = "wav"
    streaming_mode: Union[bool, int] = False


class SynthesisResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    audio_url: Optional[str] = None
    duration: Optional[float] = None
