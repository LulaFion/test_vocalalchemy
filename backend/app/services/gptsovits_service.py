import httpx
import uuid
from pathlib import Path
from typing import Optional

from ..config import settings
from ..models.character import Character


class GPTSoVITSService:
    def __init__(self):
        self.base_url = settings.gptsovits_url
        self._current_gpt_model: Optional[str] = None
        self._current_sovits_model: Optional[str] = None

    async def check_health(self) -> bool:
        """Check if GPT-SoVITS API is running."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/")
                return response.status_code < 500
        except Exception:
            return False

    async def load_models(self, character: Character) -> tuple[bool, str]:
        """Load GPT and SoVITS models for a character."""
        if not character.model_paths:
            return False, "Character has no model paths configured"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Load GPT model if different from current
                gpt_path = character.model_paths.gpt_model
                if gpt_path != self._current_gpt_model:
                    response = await client.get(
                        f"{self.base_url}/set_gpt_weights",
                        params={"weights_path": gpt_path}
                    )
                    if response.status_code != 200:
                        return False, f"Failed to load GPT model: {response.text}"
                    self._current_gpt_model = gpt_path

                # Load SoVITS model if different from current
                sovits_path = character.model_paths.sovits_model
                if sovits_path != self._current_sovits_model:
                    response = await client.get(
                        f"{self.base_url}/set_sovits_weights",
                        params={"weights_path": sovits_path}
                    )
                    if response.status_code != 200:
                        return False, f"Failed to load SoVITS model: {response.text}"
                    self._current_sovits_model = sovits_path

                return True, "Models loaded successfully"

        except httpx.TimeoutException:
            return False, "Timeout loading models"
        except Exception as e:
            return False, f"Error loading models: {str(e)}"

    async def synthesize(
        self,
        character: Character,
        text: str,
        text_lang: str = "en",
        top_k: int = 5,
        top_p: float = 1.0,
        temperature: float = 1.0,
        speed_factor: float = 1.0,
        text_split_method: str = "cut5",
        seed: int = -1,
        # Optional reference audio override
        ref_audio_path: Optional[str] = None,
        prompt_text: Optional[str] = None,
        prompt_lang: Optional[str] = None,
    ) -> tuple[bool, str, Optional[bytes]]:
        """
        Synthesize speech using GPT-SoVITS.
        Returns: (success, message, audio_bytes)

        Args:
            ref_audio_path: Override reference audio path (if not provided, uses character's default)
            prompt_text: Override reference text (if not provided, uses character's default)
            prompt_lang: Override reference language (if not provided, uses character's language)
        """
        if not character.model_paths:
            return False, "Character has no model paths", None

        # Load models first
        success, msg = await self.load_models(character)
        if not success:
            return False, msg, None

        # Use provided reference audio or fall back to character's default
        ref_audio = ref_audio_path or character.model_paths.reference_audio
        ref_text = prompt_text if prompt_text is not None else (character.model_paths.reference_text or "")

        if not ref_audio:
            return False, "No reference audio provided. Please upload a reference audio clip.", None

        # Determine prompt language
        if prompt_lang:
            final_prompt_lang = self._get_language_code(prompt_lang)
        else:
            final_prompt_lang = self._get_language_code(character.language)

        tts_params = {
            "text": text,
            "text_lang": text_lang.lower(),
            "ref_audio_path": ref_audio,
            "prompt_text": ref_text,
            "prompt_lang": final_prompt_lang,
            "top_k": top_k,
            "top_p": top_p,
            "temperature": temperature,
            "speed_factor": speed_factor,
            "text_split_method": text_split_method,
            "seed": seed,
            "media_type": "wav",
            "streaming_mode": 0,
        }

        # Debug: print the TTS parameters
        print(f"[GPT-SoVITS TTS] Request params: {tts_params}")

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/tts",
                    json=tts_params
                )

                if response.status_code == 200:
                    return True, "Synthesis successful", response.content
                else:
                    error_msg = response.text
                    print(f"[GPT-SoVITS TTS] Error response: {error_msg}")
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("message", error_msg)
                    except Exception:
                        pass
                    return False, f"Synthesis failed: {error_msg}", None

        except httpx.TimeoutException:
            return False, "Synthesis timeout - text may be too long", None
        except Exception as e:
            return False, f"Synthesis error: {str(e)}", None

    def _get_language_code(self, language: str) -> str:
        """Convert language code to GPT-SoVITS format."""
        lang_map = {
            "en_US": "en",
            "en": "en",
            "zh_CN": "zh",
            "zh": "zh",
            "ja_JP": "ja",
            "ja": "ja",
            "ko_KR": "ko",
            "ko": "ko",
            "yue": "yue",
        }
        return lang_map.get(language, "en")

    async def save_audio(self, audio_bytes: bytes, filename: Optional[str] = None) -> str:
        """Save audio bytes to file and return the path."""
        settings.audio_dir.mkdir(parents=True, exist_ok=True)

        if not filename:
            filename = f"{uuid.uuid4().hex[:8]}.wav"

        filepath = settings.audio_dir / filename
        with open(filepath, "wb") as f:
            f.write(audio_bytes)

        return str(filepath)


gptsovits_service = GPTSoVITSService()
