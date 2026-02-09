"""
Shared audio conversion utilities for VocalAlchemy.
Consolidates audio format conversion logic used across the application.
"""

import os
from pathlib import Path
from typing import Tuple, Optional


def convert_audio_to_wav(
    input_path: Path,
    output_path: Path,
    delete_original: bool = True
) -> Tuple[bool, Optional[str]]:
    """
    Convert audio file to PCM_16 WAV format suitable for GPT-SoVITS.

    Tries multiple backends in order: soundfile, librosa, scipy.
    Handles stereo to mono conversion and audio normalization.

    Args:
        input_path: Path to the input audio file
        output_path: Path where the converted WAV should be saved
        delete_original: Whether to delete the original file after conversion

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    converted = False
    last_error = None

    # Try soundfile first (fastest, most compatible)
    if not converted:
        try:
            import soundfile as sf
            import numpy as np

            audio_data, sample_rate = sf.read(str(input_path))

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
        except ImportError as e:
            last_error = f"soundfile not available: {e}"
        except Exception as e:
            last_error = f"soundfile conversion failed: {e}"

    # Try librosa as fallback
    if not converted:
        try:
            import librosa
            import soundfile as sf

            # librosa.load automatically converts to mono
            audio_data, sample_rate = librosa.load(str(input_path), sr=None, mono=True)
            sf.write(str(output_path), audio_data, sample_rate, subtype='PCM_16')
            converted = True
        except ImportError as e:
            last_error = f"librosa not available: {e}"
        except Exception as e:
            last_error = f"librosa conversion failed: {e}"

    # Try scipy as another fallback
    if not converted:
        try:
            from scipy.io import wavfile
            import numpy as np

            sample_rate, audio_data = wavfile.read(str(input_path))

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

            # Convert back to int16
            audio_int16 = np.clip(audio_float * 32767, -32768, 32767).astype(np.int16)

            # Write with scipy
            wavfile.write(str(output_path), sample_rate, audio_int16)
            converted = True
        except ImportError as e:
            last_error = f"scipy not available: {e}"
        except Exception as e:
            last_error = f"scipy conversion failed: {e}"

    # Clean up original if conversion succeeded and requested
    if converted and delete_original and input_path != output_path:
        try:
            os.remove(input_path)
        except Exception:
            pass

    if converted:
        return True, None
    else:
        return False, last_error


def get_audio_info(audio_path: Path) -> Optional[dict]:
    """
    Get information about an audio file.

    Args:
        audio_path: Path to the audio file

    Returns:
        Dict with keys: sample_rate, duration, samples, channels
        or None if the file cannot be read
    """
    try:
        import soundfile as sf
        data, sample_rate = sf.read(str(audio_path))

        if len(data.shape) == 1:
            channels = 1
            samples = len(data)
        else:
            channels = data.shape[1]
            samples = data.shape[0]

        duration = samples / sample_rate

        return {
            "sample_rate": sample_rate,
            "duration": duration,
            "samples": samples,
            "channels": channels,
            "size_bytes": os.path.getsize(audio_path)
        }
    except Exception:
        return None


def validate_reference_audio(audio_path: Path, min_duration: float = 3.0, max_duration: float = 10.0) -> Tuple[bool, Optional[str]]:
    """
    Validate that an audio file is suitable for use as GPT-SoVITS reference audio.

    Args:
        audio_path: Path to the audio file
        min_duration: Minimum duration in seconds (default 3.0)
        max_duration: Maximum duration in seconds (default 10.0)

    Returns:
        Tuple of (is_valid: bool, warning_message: Optional[str])
    """
    info = get_audio_info(audio_path)

    if info is None:
        return False, "Could not read audio file"

    duration = info["duration"]

    if duration < min_duration:
        return False, f"Audio too short ({duration:.2f}s). Minimum is {min_duration}s."

    if duration > max_duration:
        return True, f"Audio duration ({duration:.2f}s) exceeds recommended maximum ({max_duration}s). May work but could affect quality."

    return True, None
