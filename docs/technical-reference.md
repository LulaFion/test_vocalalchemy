# Technical Reference

GPT-SoVITS integration specifications and API documentation for VocalAlchemy.

---

## GPT-SoVITS Integration

### Base Installation

**Location:** `C:\Users\user\Documents\Audio\GPT-SoVITS\GPT-SoVITS-v2pro-20250604`

**Required Components:**
- GPT-SoVITS inference engine
- Pre-trained base models
- UVR5 vocal separation models
- ASR (Automatic Speech Recognition) models

### Deployment Architecture

**Recommended: Option 2A - Separate Service**

```
┌─────────────────────────────────────────┐
│  VocalAlchemy Frontend (React)          │
│  Port: 3000                             │
└───────────────┬─────────────────────────┘
                │ HTTP/WebSocket
                ↓
┌─────────────────────────────────────────┐
│  VocalAlchemy Backend (FastAPI)         │
│  Port: 8000                             │
│  • Character management API             │
│  • Audio file storage                   │
│  • User session handling                │
└───────────────┬─────────────────────────┘
                │ HTTP API calls
                ↓
┌─────────────────────────────────────────┐
│  GPT-SoVITS Service                     │
│  Port: 9880 (default)                   │
│  • Voice synthesis inference            │
│  • Character training pipeline          │
│  • Model management                     │
└─────────────────────────────────────────┘
```

**Benefits:**
- Clean separation of concerns
- Independent scaling
- Easier debugging and maintenance
- Can restart GPT-SoVITS without affecting main app

---

## API Specifications

### VocalAlchemy Backend API

#### Character Management

**GET /api/characters**
```json
Response: {
  "characters": [
    {
      "id": "char_abc123",
      "name": "Alice_Cheerful",
      "status": "ready|training|failed",
      "created_at": "2025-01-15T10:30:00Z",
      "training_duration": "15:32",
      "audio_minutes": 15.5,
      "language": "en_US"
    }
  ]
}
```

**POST /api/characters/create**
```json
Request: {
  "name": "Alice_Cheerful",
  "audio_file": "<multipart/form-data>",
  "language": "en_US|zh_CN|ja_JP|yue|ko",
  "mode": "simple|advanced",
  "options": {
    "remove_bgm": true,
    "denoise": true,
    "auto_slice": true,
    "auto_transcribe": true
  }
}

Response: {
  "character_id": "char_abc123",
  "status": "training",
  "job_id": "job_xyz789"
}
```

**GET /api/characters/{id}/status**
```json
Response: {
  "character_id": "char_abc123",
  "status": "training",
  "progress": 65,
  "current_step": "audio_slicing",
  "estimated_remaining_seconds": 1080,
  "completed_steps": [
    "vocal_separation",
    "noise_reduction"
  ],
  "pending_steps": [
    "audio_slicing",
    "transcription",
    "dataset_preparation",
    "model_training"
  ]
}
```

**DELETE /api/characters/{id}**
```json
Response: {
  "success": true,
  "message": "Character deleted successfully"
}
```

#### Voice Synthesis

**POST /api/synthesize**
```json
Request: {
  "character_id": "char_abc123",
  "text": "Congratulations! You've won the grand prize!",
  "text_language": "en",
  "emotion_preset": "excited|calm|happy|dramatic|mysterious",
  "emotion_intensity": 0.7,
  "reference_audio": "<optional: base64 encoded audio>",
  "speed": 1.0,
  "top_k": 20,
  "top_p": 0.6,
  "temperature": 0.6,
  "freeze": false,
  "pause_duration": 0.3
}

Response: {
  "audio_url": "/api/audio/output_abc123.wav",
  "duration": 8.5,
  "metadata": {
    "character": "Alice_Cheerful",
    "emotion": "excited",
    "text_length": 120
  }
}
```

**POST /api/synthesize/preview**
- Same as `/api/synthesize` but optimized for speed
- Lower quality, faster generation for quick previews

---

## GPT-SoVITS Backend Integration

### Core Functions

#### Reference Audio Handling

**File:** `GPT_SoVITS/inference_webui.py`

```python
# Line 813: Load reference audio
def load_reference_audio(ref_wav_path):
    wav16k, sr = librosa.load(ref_wav_path, sr=16000)
    return wav16k

# Reference audio input (Line 1163)
inp_ref = gr.Audio(
    label=i18n("请上传3~10秒内参考音频"),
    type="filepath",
    scale=13
)
```

**Storage Location:**
- Temporary files managed by Gradio: `{temp_dir}/gradio/{session_id}/{component_id}/`
- VocalAlchemy should copy to permanent storage: `VocalAlchemy/audio/references/{character_id}/`

#### Voice Synthesis Pipeline

**File:** `GPT_SoVITS/inference_webui.py`

```python
# Main TTS function (Line 751)
def get_tts_wav(
    ref_wav_path,        # Reference audio file path
    prompt_text,         # Reference audio transcript
    prompt_language,     # Reference audio language
    text,                # Text to synthesize
    text_language,       # Text language
    how_to_cut="不切",    # Text slicing method
    top_k=20,            # GPT sampling parameter
    top_p=0.6,           # GPT sampling parameter
    temperature=0.6,     # GPT sampling parameter
    ref_free=False,      # Reference-free mode
    speed=1.0,           # Speech rate multiplier
    if_freeze=False,     # Cache seed for consistency
    inp_refs=None,       # Multiple reference audios
    sample_steps=8,      # Diffusion steps (v3/v4 only)
    if_sr=False,         # Super resolution
    pause_duration=0.3   # Pause duration between sentences
):
    # Returns: generator yielding (sample_rate, audio_data)
```

**Key Processing Steps:**

1. **Load Reference Audio** (Line 813)
```python
wav16k, sr = librosa.load(ref_wav_path, sr=16000)
```

2. **Text-to-Semantic (GPT Model)** (Lines 878-890)
```python
pred_semantic, idx = t2s_model.model.infer_panel(
    all_phoneme_ids,
    all_phoneme_len,
    None if ref_free else prompt,
    bert,
    top_k=top_k,        # Controls diversity
    top_p=top_p,        # Nucleus sampling
    temperature=temperature,  # Randomness
    early_stop_num=hz * max_sec,
)
```

3. **Semantic-to-Waveform (SoVITS Model)**
```python
# v1/v2 models
audio = vq_model.decode(
    pred_semantic,
    torch.LongTensor(phones2).to(device).unsqueeze(0),
    refer,
    speed=speed
).detach().cpu().numpy()[0, 0]

# v3/v4 models (diffusion-based)
audio = vq_model.decode(
    pred_semantic,
    torch.LongTensor(phones2).to(device).unsqueeze(0),
    refer,
    speed=speed,
    num_sample_steps=sample_steps
).detach().cpu().numpy()[0, 0]
```

#### Parameter Effects

| Parameter | Range | Effect | Recommended |
|-----------|-------|--------|-------------|
| `top_k` | 1-100 | Limits vocabulary diversity. Lower = more conservative | 15-25 |
| `top_p` | 0.1-1.0 | Nucleus sampling threshold. Lower = more focused | 0.6-0.8 |
| `temperature` | 0.1-1.0 | Randomness. Lower = more consistent | 0.6-0.8 |
| `speed` | 0.5-2.0 | Speech rate multiplier | 0.8-1.2 |
| `pause_duration` | 0.0-1.0 | Silence between sentences (seconds) | 0.3-0.5 |
| `sample_steps` | 1-50 | Diffusion steps (v3/v4). Higher = better quality, slower | 8-16 |

### Training Pipeline (One-Click)

**File:** `webui.py`

```python
# Line 1046: One-click training pipeline
def open1abc():
    # Step 1: UVR5 Vocal Separation (10%)
    uvr5_separation()

    # Step 2: Audio Denoising (30%)
    denoise_audio()

    # Step 3: Audio Slicing (50%)
    slice_audio()

    # Step 4: ASR Transcription (50%)
    asr_transcribe()

    # Step 5: Dataset Preparation (70%)
    extract_features()

    # Step 6: Model Training (70-100%)
    train_sovits_model()
    train_gpt_model()
```

**VocalAlchemy Integration:**
- Call GPT-SoVITS API endpoints for each step
- Poll for progress updates
- Handle errors and allow retry/cancel

---

## Training Configuration

### Simple Mode Defaults

```python
SIMPLE_MODE_CONFIG = {
    "uvr5": {
        "model": "HP5_only_main_vocal",
        "aggressive": 10  # Vocal extraction aggressiveness
    },
    "denoise": {
        "enabled": True,
        "threshold": -30  # dB threshold
    },
    "slice": {
        "min_length": 2,    # seconds
        "max_length": 10,   # seconds
        "silence_threshold": -40  # dB
    },
    "asr": {
        "model": "auto",  # Auto-detect language
        "batch_size": 16
    },
    "training": {
        "sovits_epochs": 8,
        "gpt_epochs": 15,
        "batch_size": 6,
        "learning_rate": 0.0001
    }
}
```

### Advanced Mode Configurable Parameters

```python
ADVANCED_MODE_CONFIG = {
    "uvr5": {
        "model": "HP5_only_main_vocal|HP2_all_vocals|HP3_all_vocals",
        "aggressive": 0-20,
        "format": "wav|flac"
    },
    "slice": {
        "min_length": 1-15,
        "max_length": 5-30,
        "min_interval": 300,  # milliseconds
        "hop_size": 10,       # milliseconds
        "max_sil_kept": 500   # milliseconds
    },
    "training": {
        "sovits_epochs": 1-50,
        "gpt_epochs": 1-50,
        "batch_size": 1-16,
        "learning_rate": 0.00001-0.001,
        "save_frequency": 5   # Save checkpoint every N epochs
    }
}
```

---

## Emotion Preset System

### Preset Mapping

VocalAlchemy emotion presets map to pre-recorded reference audio files.

```python
EMOTION_PRESETS = {
    "calm": {
        "reference_audio": "audio/presets/calm_en.wav",
        "reference_text": "This is a calm and steady voice.",
        "language": "en",
        "suggested_params": {
            "temperature": 0.5,
            "top_p": 0.7,
            "speed": 0.95
        }
    },
    "happy": {
        "reference_audio": "audio/presets/happy_en.wav",
        "reference_text": "I'm so happy and cheerful!",
        "language": "en",
        "suggested_params": {
            "temperature": 0.65,
            "top_p": 0.75,
            "speed": 1.05
        }
    },
    "excited": {
        "reference_audio": "audio/presets/excited_en.wav",
        "reference_text": "Wow! This is amazing!",
        "language": "en",
        "suggested_params": {
            "temperature": 0.7,
            "top_p": 0.8,
            "speed": 1.15
        }
    },
    "dramatic": {
        "reference_audio": "audio/presets/dramatic_en.wav",
        "reference_text": "This is a moment of epic significance.",
        "language": "en",
        "suggested_params": {
            "temperature": 0.75,
            "top_p": 0.8,
            "speed": 0.9
        }
    },
    "mysterious": {
        "reference_audio": "audio/presets/mysterious_en.wav",
        "reference_text": "Something strange is happening here...",
        "language": "en",
        "suggested_params": {
            "temperature": 0.6,
            "top_p": 0.75,
            "speed": 0.85
        }
    }
}
```

### Emotion Intensity Slider

**Implementation:**
```python
def apply_emotion_intensity(base_params, intensity):
    """
    Intensity range: 0.0 (Subtle) to 1.0 (Strong)
    Adjusts temperature and speed based on intensity
    """
    adjusted_params = base_params.copy()

    # Scale temperature (higher intensity = more variation)
    base_temp = base_params["temperature"]
    adjusted_params["temperature"] = base_temp + (intensity - 0.5) * 0.2

    # Scale speed (higher intensity = more pronounced speed)
    base_speed = base_params["speed"]
    if base_speed > 1.0:  # Fast emotions get faster
        adjusted_params["speed"] = base_speed + (intensity - 0.5) * 0.2
    elif base_speed < 1.0:  # Slow emotions get slower
        adjusted_params["speed"] = base_speed - (intensity - 0.5) * 0.1

    return adjusted_params
```

---

## Audio Export Format

### Output Specifications

**WAV Export:**
```python
WAV_EXPORT_CONFIG = {
    "sample_rate": 32000,  # GPT-SoVITS default output
    "bit_depth": 16,
    "channels": 1,         # Mono
    "format": "PCM"
}
```

**MP3 Export:**
```python
MP3_EXPORT_CONFIG = {
    "sample_rate": 32000,
    "bitrate": "192k",     # High quality
    "channels": 1,
    "codec": "libmp3lame"
}
```

**Conversion Example (FFmpeg):**
```python
import subprocess

def export_to_mp3(wav_path, mp3_path):
    subprocess.run([
        "ffmpeg",
        "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        "-ar", "32000",
        "-ac", "1",
        mp3_path
    ])
```

---

## Model File Structure

### Character Model Storage

```
VocalAlchemy/models/
└── characters/
    └── char_abc123_Alice_Cheerful/
        ├── config.json              # Character metadata
        ├── sovits_model.pth         # SoVITS voice model
        ├── gpt_model.ckpt           # GPT prosody model
        ├── reference_audio.wav      # Training reference audio
        └── training_logs/
            ├── sovits_train.log
            └── gpt_train.log
```

**config.json Example:**
```json
{
  "character_id": "char_abc123",
  "name": "Alice_Cheerful",
  "language": "en_US",
  "created_at": "2025-01-15T10:30:00Z",
  "training_config": {
    "audio_duration_seconds": 932,
    "audio_files_count": 687,
    "sovits_epochs": 8,
    "gpt_epochs": 15,
    "total_training_time_seconds": 1847
  },
  "model_version": "v2pro-20250604",
  "sovits_path": "sovits_model.pth",
  "gpt_path": "gpt_model.ckpt"
}
```

---

## Error Handling

### Common Error Codes

| Code | Error | Cause | Solution |
|------|-------|-------|----------|
| `E001` | Reference audio too short | Audio < 3 seconds | Re-upload longer reference |
| `E002` | Reference audio too long | Audio > 10 seconds | Trim reference audio |
| `E003` | Training audio insufficient | Audio < 5 minutes | Upload more training data |
| `E004` | ASR transcription failed | Low audio quality / unsupported language | Check audio quality, verify language selection |
| `E005` | Model training OOM | Insufficient GPU memory | Reduce batch size |
| `E006` | Character not found | Invalid character_id | Verify character exists |
| `E007` | Synthesis timeout | Text too long / server overloaded | Split text into smaller chunks |

### Error Response Format

```json
{
  "error": true,
  "code": "E004",
  "message": "ASR transcription failed",
  "details": "Unable to transcribe audio. Please check audio quality and language selection.",
  "retry_allowed": true
}
```

---

## Performance Optimization

### Inference Speed

**Typical Synthesis Times (RTX 3090):**
- 10-word sentence: ~2-3 seconds
- 50-word paragraph: ~8-12 seconds
- 100-word script: ~18-25 seconds

**Optimization Strategies:**
1. **Batch Processing:** Generate multiple lines in parallel
2. **Caching:** Cache reference audio features for repeated use
3. **Model Quantization:** Use FP16 inference for 2x speed boost
4. **GPU Warm-up:** Pre-load models to avoid cold start latency

### Training Speed

**Typical Training Times (RTX 3090):**
- 5 minutes audio: ~20-30 minutes training
- 15 minutes audio: ~45-60 minutes training
- 30 minutes audio: ~90-120 minutes training

**Factors Affecting Training Speed:**
- Audio duration
- Slice count (more slices = longer training)
- Batch size (larger = faster but more VRAM)
- Epoch count

---

## Security Considerations

### API Authentication

**JWT Token-based Authentication:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # Verify JWT token
    if not is_valid_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return token
```

### File Upload Validation

```python
ALLOWED_AUDIO_FORMATS = [".wav", ".mp3", ".flac", ".m4a"]
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB

def validate_audio_upload(file):
    # Check file extension
    if not any(file.filename.endswith(ext) for ext in ALLOWED_AUDIO_FORMATS):
        raise ValueError("Invalid file format")

    # Check file size
    if file.size > MAX_UPLOAD_SIZE:
        raise ValueError("File too large")

    # Verify it's actually audio (magic bytes check)
    # ... additional validation
```

### Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/synthesize")
@limiter.limit("10/minute")  # Max 10 synthesis requests per minute
async def synthesize_voice(request: SynthesisRequest):
    # ... synthesis logic
```

---

*For UI specifications, see [ui-flowcharts.md](./ui-flowcharts.md)*

*For design system, see [design-system.md](./design-system.md)*
