# Vocal Alchemy

Internal AI Character Voice System

**Timbre–Prosody Disentanglement:** 建立一套內部 AI 角色配音系統，可用「角色 A 的聲音」搭配「不同的語氣」，快速生成高品質遊戲配音。

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| **[Training Workflows](./docs/training-workflows.md)** | Complete UI specs for Simple & Advanced character training modes |
| **[Design System](./docs/design-system.md)** | Color palette, typography, components (Cyber-Alchemist theme) |
| **[UI Flowcharts](./docs/ui-flowcharts.md)** | Detailed page layouts and user flows |
| **[Technical Reference](./docs/technical-reference.md)** | GPT-SoVITS integration, API specifications |
| **[Development Guide](./docs/development.md)** | Tech stack, setup instructions, contributing |

---

## Core Concept

Voice and tone decoupling (Disentangled):

- **Timbre (聲音):** Determines "who is speaking" - character identity, brand consistency
- **Prosody (語氣):** Determines "how they speak" - emotion, rhythm, performance feel

Through the AI inference engine, **combine both in real-time** to generate final voiceovers without repeated recordings or model retraining.

---

## Main Capabilities

### Input

1. **Character Voice Data** - 5–30 minutes of clean audio to establish character voice features (timbre)
2. **Tone Reference** - 5–10 second audio clips or emotion presets to specify emotion/rhythm/style
3. **Script Text** - The dialogue to synthesize

### Output

- High-quality audio with desired voice and tone

---

## System Architecture

```
┌─────────────────┐         ┌──────────────────┐
│ Character Voice │         │ Emotion/Style    │
│   (Timbre)      │         │   (Prosody)      │
│                 │         │                  │
│ • Alice         │         │ • Calm           │
│ • Bob           │    +    │ • Excited        │
│ • Charlie       │         │ • Mysterious     │
│ ...             │         │ ...              │
└─────────────────┘         └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ↓
            ┌────────────────┐
            │ GPT-SoVITS     │
            │ Inference      │
            │ Engine         │
            └────────────────┘
                     ↓
            ┌────────────────┐
            │ Generated      │
            │ Voiceover      │
            └────────────────┘
```

### Components

#### 1. Character Database

- **Character Repository:** Display list of trained characters with status indicators (Ready, Training, Failed)
- **Training Center:**
  - **Simple Mode (Default):** One-click automated pipeline - [Specs](./docs/training-workflows.md#simple-mode-recommended)
  - **Advanced Mode:** Manual control over preprocessing steps - [Specs](./docs/training-workflows.md#advanced-mode-separate-page)

#### 2. Emotion Database

- **Emotion Presets:** Matrix/sliders to select tone (corresponds to internal reference audio)
- **Reference Audio:** 5-10 second clips as emotion "seeds" for advanced users

#### 3. Voice Synthesis UI

- Character selection
- Emotion/style selection
- Script input
- Real-time audio generation
- Output with export options

---

## Quick Start

### For Designers

1. Review [Design System](./docs/design-system.md) for color palette and typography
2. Check [UI Flowcharts](./docs/ui-flowcharts.md) for detailed page layouts
3. Reference [Training Workflows](./docs/training-workflows.md) for complete UI specifications

### For Developers

1. Read [Development Guide](./docs/development.md) for setup instructions
2. Review [Technical Reference](./docs/technical-reference.md) for API specs
3. See [Design System](./docs/design-system.md) for CSS variables and components

### For Product Managers

1. Understand [Core Concept](#core-concept) for product positioning
2. Review [Training Workflows](./docs/training-workflows.md) for user experience flows
3. Check [Main Capabilities](#main-capabilities) for feature scope

---

## Technical Stack

- **Frontend:** React + TypeScript
- **UI Framework:** TailwindCSS
- **Backend:** Python (FastAPI)
- **AI Engine:** [GPT-SoVITS-v2pro](https://github.com/RVC-Boss/GPT-SoVITS)
- **Audio Processing:** FFmpeg, librosa

**Base Path:** `C:\Users\user\Documents\Audio\GPT-SoVITS\GPT-SoVITS-v2pro-20250604`

---

## Key Features

✨ **Timbre-Prosody Separation** - Independent control of voice and emotion
⚡ **One-Click Training** - Automated character creation pipeline
🎛️ **Advanced Control** - Manual preprocessing for power users
🎨 **Emotion Templates** - Reference audio templates for Default (Zero-shot) character
🔄 **Real-time Synthesis** - Fast voice generation without retraining
📊 **Progress Tracking** - Visual feedback during training
🌐 **Multi-language** - Support for Chinese, English, Japanese, Cantonese, Korean
📁 **Audio Library** - Save and manage well-generated audio files with metadata
🔧 **Use Settings** - Apply saved synthesis parameters from library items to quickly recreate similar audio
📋 **Custom Display Name** - Set editable display names (note) when saving audio to library
🗑️ **Soft Delete** - 7-day trash retention for deleted characters with restore option
🧹 **Auto Cleanup** - Generated audio older than 24 hours is automatically cleaned on startup
📝 **Reference Text Auto-fill** - Transcript from .txt files automatically fills reference text field
🐳 **Docker Ready** - Full Docker/GitLab CI/CD support for deployment
🔠 **UI Language Requirement:** All user-facing text in the web application should be displayed in Chinese with English in parentheses. Example: `角色聲音 (Character Voice)`

---

## Project Structure

```
VocalAlchemy/
├── CLAUDE.md              # This file - Documentation index
├── docker-compose.yml     # Docker orchestration
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── .gitlab-ci.yml         # GitLab CI/CD pipeline
├── docs/                  # Detailed specifications
│   ├── training-workflows.md
│   ├── design-system.md
│   ├── ui-flowcharts.md
│   ├── technical-reference.md
│   └── development.md
├── frontend/              # React web application
│   ├── Dockerfile         # Frontend container
│   ├── nginx.conf         # Nginx config for production
│   └── src/
│       ├── pages/         # Page components (Home, Characters, Training, Library, Settings)
│       ├── components/    # Reusable UI components
│       ├── stores/        # Zustand state management
│       ├── services/      # API services
│       └── types/         # TypeScript types
├── backend/               # FastAPI server
│   ├── Dockerfile         # Backend container
│   ├── app/
│   │   ├── main.py        # Application entry point
│   │   ├── config.py      # Configuration settings
│   │   ├── routers/       # API endpoints (characters, synthesis, training, library)
│   │   ├── services/      # Business logic
│   │   └── models/        # Pydantic models
│   └── data/              # Runtime data
│       ├── audio/         # Generated audio files (auto-cleaned after 24h)
│       ├── library/       # Saved audio library (permanent, user-managed)
│       ├── emotion_audio/ # Reference audio templates
│       │   ├── Female/    # Female voice templates by language/emotion
│       │   ├── Male/      # Male voice templates by language/emotion
│       │   ├── {Character}/ # Fine-tuned character reference audio (e.g., Xixi/, Zordon/)
│       │   └── *.txt      # Transcript files (same name as audio, auto-fills reference text)
│       ├── models/        # GPT_weights, SoVITS_weights
│       └── training_projects/
└── models/                # Trained voice models
```

---

## Storage Policy

| Location | Purpose | Cleanup |
|----------|---------|---------|
| `data/audio/` | Temporary generated audio | Auto-cleaned if older than 24 hours on backend startup |
| `data/library/` | User-saved audio files | Never auto-deleted (manual delete only) |
| `data/emotion_audio/` | Reference audio templates | Permanent (shipped with project) |

### Reference Audio with Transcripts

Place a `.txt` file with the same name as an audio file to enable automatic reference text filling:
```
emotion_audio/Xixi/template1.wav
emotion_audio/Xixi/template1.txt  # Contains transcript, auto-fills when user clicks "Use"
```

### Library Metadata (JSON Sidecar)

Each saved audio in `data/library/` can have a JSON sidecar file with synthesis metadata:
```json
{
  "top_k": 45,
  "top_p": 0.45,
  "temperature": 0.8,
  "speed": 1.0,
  "duration": 1.21,
  "character_id": "54d6b719",
  "character_name": "Xixi",
  "text": "好運來了",
  "text_language": "zh",
  "ref_audio_source": "Female\\zh\\excited\\youngvoice_template.wav",
  "note": "女聲愉快年輕",
  "audio_filename": "女聲愉快年輕_好運來了.wav",
  "created_at": "2026-01-27T15:16:00.015261"
}
```

**Key fields:**
- `note` - User-editable display name (shown instead of filename in library)
- `audio_filename` - Links JSON to audio file when filenames differ (for renamed files)
- `ref_audio_source` - Reference audio path used for synthesis (supports multiple formats)

**"Use Settings" Feature:**
Click the gear icon (⚙️) on any library item to apply its saved parameters to the Voice Synthesis page, including character selection, synthesis parameters, and reference audio.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes and test locally
3. Submit a pull request with clear description
4. Ensure all CI checks pass before merging

For detailed development setup, see [Development Guide](./docs/development.md)

---

## License

This project uses [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) which is licensed under MIT.
