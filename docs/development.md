# Development Guide

Setup instructions, tech stack, and contributing guidelines for VocalAlchemy.

---

## Tech Stack

### Frontend

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **UI Library:** TailwindCSS 3+
- **State Management:** Zustand (lightweight alternative to Redux)
- **HTTP Client:** Axios
- **Audio Visualization:** WaveSurfer.js
- **Form Handling:** React Hook Form + Zod validation
- **Routing:** React Router v6

### Backend

- **Framework:** FastAPI (Python 3.10+)
- **API Documentation:** Auto-generated OpenAPI/Swagger
- **Database:** SQLite (development) / PostgreSQL (production)
- **ORM:** SQLAlchemy
- **Task Queue:** Celery + Redis (for background training jobs)
- **File Storage:** Local filesystem (development) / S3-compatible (production)
- **Authentication:** JWT tokens

### AI/Audio Processing

- **Voice Synthesis:** GPT-SoVITS-v2pro-20250604
- **Audio Processing:** FFmpeg, librosa, soundfile
- **Model Runtime:** PyTorch 2.0+ with CUDA support

### DevOps

- **Version Control:** Git
- **Package Management:** npm (frontend), pip + virtualenv (backend)
- **Linting:** ESLint (frontend), Ruff (backend)
- **Formatting:** Prettier (frontend), Black (backend)
- **Testing:** Vitest (frontend), pytest (backend)

---

## Environment Setup

### Prerequisites

**Required Software:**
- Python 3.10 or higher
- Node.js 18+ and npm 9+
- Git
- CUDA 11.8+ (for GPU acceleration)
- FFmpeg

**Hardware Requirements:**
- **Minimum:** 16GB RAM, 8GB VRAM (NVIDIA GPU)
- **Recommended:** 32GB RAM, 12GB+ VRAM (RTX 3090 or better)
- 50GB+ free disk space

### 1. Clone Repository

```bash
cd C:\Users\user\Documents\Audio\GPT-SoVITS
git clone <repository-url> VocalAlchemy
cd VocalAlchemy
```

### 2. Backend Setup

```bash
# Create Python virtual environment
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# See "Environment Variables" section below
```

**requirements.txt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
celery==5.3.4
redis==5.0.1
librosa==0.10.1
soundfile==0.12.1
torch==2.1.0+cu118
torchaudio==2.1.0+cu118
numpy==1.24.3
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
```

**package.json (key dependencies):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.2",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",
    "wavesurfer.js": "^7.4.3",
    "react-hook-form": "^7.48.2",
    "zod": "^3.22.4",
    "@headlessui/react": "^1.7.17"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1",
    "vitest": "^1.0.4"
  }
}
```

### 4. GPT-SoVITS Service Setup

```bash
# GPT-SoVITS is already installed at:
cd C:\Users\user\Documents\Audio\GPT-SoVITS\GPT-SoVITS-v2pro-20250604

# Download required models (if not already present)
# Models should be in: GPT_weights/ and SoVITS_weights/

# Test GPT-SoVITS service
runtime\python.exe -I webui.py en_US
# Should open webUI at http://localhost:9880
```

### 5. Database Setup

```bash
# Navigate to backend directory
cd C:\Users\user\Documents\Audio\GPT-SoVITS\VocalAlchemy\backend

# Activate virtual environment
venv\Scripts\activate

# Run database migrations
alembic upgrade head

# (Optional) Seed database with sample data
python scripts/seed_database.py
```

---

## Environment Variables

### Backend (.env)

```bash
# Application
APP_NAME=VocalAlchemy
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=sqlite:///./vocalalchemy.db
# Production: postgresql://user:password@localhost:5432/vocalalchemy

# GPT-SoVITS Service
GPTSOVITS_BASE_PATH=C:/Users/user/Documents/Audio/GPT-SoVITS/GPT-SoVITS-v2pro-20250604
GPTSOVITS_API_URL=http://localhost:9880

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# File Storage
UPLOAD_DIR=./storage/uploads
MODEL_DIR=./storage/models
AUDIO_DIR=./storage/audio

# JWT Authentication
JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Audio Processing
MAX_UPLOAD_SIZE_MB=500
ALLOWED_AUDIO_FORMATS=wav,mp3,flac,m4a

# Training
MAX_CONCURRENT_TRAINING_JOBS=2
TRAINING_TIMEOUT_HOURS=6
```

### Frontend (.env)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# Application
VITE_APP_NAME=VocalAlchemy
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ADVANCED_MODE=true
VITE_ENABLE_BATCH_SYNTHESIS=false

# Audio
VITE_MAX_AUDIO_PREVIEW_DURATION=30
VITE_DEFAULT_SAMPLE_RATE=32000
```

---

## Development Workflow

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Celery Worker (for training jobs):**
```bash
cd backend
venv\Scripts\activate
celery -A app.tasks worker --loglevel=info --pool=solo
```

**Terminal 4 - GPT-SoVITS Service:**
```bash
cd C:\Users\user\Documents\Audio\GPT-SoVITS\GPT-SoVITS-v2pro-20250604
runtime\python.exe -I webui.py en_US
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- GPT-SoVITS: http://localhost:9880

### Code Style

**Frontend (TypeScript/React):**
```bash
# Lint check
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

**ESLint Config (.eslintrc.js):**
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
```

**Backend (Python):**
```bash
# Lint check
ruff check .

# Format code
black .

# Type check
mypy .
```

**pyproject.toml:**
```toml
[tool.black]
line-length = 100
target-version = ['py310']

[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "W"]

[tool.mypy]
python_version = "3.10"
strict = true
```

---

## Project Structure

```
VocalAlchemy/
├── frontend/                   # React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Generic components (Button, Input, etc.)
│   │   │   ├── character/      # Character-related components
│   │   │   ├── synthesis/      # Voice synthesis components
│   │   │   └── training/       # Training workflow components
│   │   ├── pages/              # Page components
│   │   │   ├── Home.tsx        # Main synthesis page
│   │   │   ├── Characters.tsx  # Character repository
│   │   │   ├── Training.tsx    # Simple mode training
│   │   │   └── AdvancedTraining.tsx  # Advanced mode wizard
│   │   ├── stores/             # Zustand state stores
│   │   │   ├── characterStore.ts
│   │   │   ├── synthesisStore.ts
│   │   │   └── trainingStore.ts
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client services
│   │   │   ├── api.ts          # Axios instance
│   │   │   ├── characterService.ts
│   │   │   └── synthesisService.ts
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── v1/
│   │   │   │   ├── characters.py
│   │   │   │   ├── synthesis.py
│   │   │   │   └── training.py
│   │   │   └── deps.py         # Dependency injection
│   │   ├── core/               # Core functionality
│   │   │   ├── config.py       # Settings
│   │   │   ├── security.py     # Authentication
│   │   │   └── exceptions.py   # Custom exceptions
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── character.py
│   │   │   ├── synthesis_job.py
│   │   │   └── training_job.py
│   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── character.py
│   │   │   ├── synthesis.py
│   │   │   └── training.py
│   │   ├── services/           # Business logic
│   │   │   ├── character_service.py
│   │   │   ├── synthesis_service.py
│   │   │   ├── training_service.py
│   │   │   └── gptsovits_client.py  # GPT-SoVITS API client
│   │   ├── tasks/              # Celery tasks
│   │   │   └── training_tasks.py
│   │   └── utils/              # Utility functions
│   │       ├── audio.py        # Audio processing helpers
│   │       └── file.py         # File handling helpers
│   ├── alembic/                # Database migrations
│   ├── scripts/                # Utility scripts
│   ├── tests/                  # pytest tests
│   ├── main.py                 # Application entry point
│   ├── requirements.txt
│   └── .env.example
│
├── models/                     # Trained character models
│   └── characters/
│       └── char_abc123_Alice_Cheerful/
│
├── storage/                    # Runtime storage
│   ├── uploads/                # Uploaded audio files
│   ├── audio/                  # Generated audio outputs
│   └── temp/                   # Temporary processing files
│
├── docs/                       # Documentation
│   ├── training-workflows.md
│   ├── design-system.md
│   ├── ui-flowcharts.md
│   ├── technical-reference.md
│   └── development.md          # This file
│
├── README.md
├── CLAUDE-NEW.md               # Documentation index
└── .gitignore
```

---

## Database Schema

### Characters Table

```sql
CREATE TABLE characters (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- 'ready', 'training', 'failed'
    language VARCHAR(10) NOT NULL,
    audio_duration_seconds INTEGER,
    audio_files_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sovits_model_path VARCHAR(512),
    gpt_model_path VARCHAR(512),
    config JSON
);
```

### Synthesis Jobs Table

```sql
CREATE TABLE synthesis_jobs (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,  -- 'pending', 'processing', 'completed', 'failed'
    output_audio_path VARCHAR(512),
    parameters JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

### Training Jobs Table

```sql
CREATE TABLE training_jobs (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    progress INTEGER DEFAULT 0,
    current_step VARCHAR(100),
    mode VARCHAR(20),  -- 'simple', 'advanced'
    config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

---

## API Client Examples

### Frontend Service Example

```typescript
// src/services/characterService.ts
import axios from './api';
import { Character, CreateCharacterRequest } from '../types';

export const characterService = {
  // Get all characters
  async getCharacters(): Promise<Character[]> {
    const response = await axios.get('/characters');
    return response.data.characters;
  },

  // Create new character
  async createCharacter(data: CreateCharacterRequest): Promise<Character> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('audio_file', data.audioFile);
    formData.append('language', data.language);
    formData.append('mode', data.mode);
    formData.append('options', JSON.stringify(data.options));

    const response = await axios.post('/characters/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Get character status
  async getCharacterStatus(characterId: string): Promise<TrainingStatus> {
    const response = await axios.get(`/characters/${characterId}/status`);
    return response.data;
  },

  // Delete character
  async deleteCharacter(characterId: string): Promise<void> {
    await axios.delete(`/characters/${characterId}`);
  }
};
```

### Backend Service Example

```python
# app/services/character_service.py
from typing import List
from sqlalchemy.orm import Session
from app.models.character import Character
from app.schemas.character import CharacterCreate
from app.services.training_service import start_training_pipeline

class CharacterService:
    @staticmethod
    async def create_character(
        db: Session,
        character_data: CharacterCreate,
        audio_file_path: str
    ) -> Character:
        # Create character record
        character = Character(
            name=character_data.name,
            language=character_data.language,
            status="training"
        )
        db.add(character)
        db.commit()
        db.refresh(character)

        # Start training pipeline (async Celery task)
        await start_training_pipeline(
            character_id=character.id,
            audio_path=audio_file_path,
            mode=character_data.mode,
            options=character_data.options
        )

        return character

    @staticmethod
    def get_all_characters(db: Session) -> List[Character]:
        return db.query(Character).order_by(Character.created_at.desc()).all()
```

---

## Testing

### Frontend Tests

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Example Component Test (Vitest + React Testing Library):**
```typescript
// src/components/character/CharacterCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CharacterCard from './CharacterCard';

describe('CharacterCard', () => {
  it('renders character name', () => {
    const character = {
      id: 'char_123',
      name: 'Alice_Cheerful',
      status: 'ready'
    };

    render(<CharacterCard character={character} />);
    expect(screen.getByText('Alice_Cheerful')).toBeInTheDocument();
  });
});
```

### Backend Tests

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_character_service.py
```

**Example Service Test:**
```python
# tests/test_character_service.py
import pytest
from app.services.character_service import CharacterService
from app.schemas.character import CharacterCreate

def test_create_character(db_session):
    character_data = CharacterCreate(
        name="TestCharacter",
        language="en_US",
        mode="simple"
    )

    character = CharacterService.create_character(
        db=db_session,
        character_data=character_data,
        audio_file_path="/path/to/audio.wav"
    )

    assert character.name == "TestCharacter"
    assert character.status == "training"
```

---

## Deployment

### Production Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET_KEY` to strong random values
- [ ] Set `DEBUG=False` in backend .env
- [ ] Use PostgreSQL instead of SQLite
- [ ] Configure Redis for Celery
- [ ] Set up reverse proxy (Nginx) for frontend + backend
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure CORS properly
- [ ] Set up logging and monitoring
- [ ] Configure file upload size limits
- [ ] Set up regular database backups
- [ ] Configure rate limiting
- [ ] Set up error tracking (e.g., Sentry)

### Docker Deployment (Optional)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/vocalalchemy
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery:
    build: ./backend
    command: celery -A app.tasks worker --loglevel=info
    depends_on:
      - redis
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=vocalalchemy
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  gptsovits:
    build: ./gptsovits
    ports:
      - "9880:9880"

volumes:
  postgres_data:
```

---

## Contributing

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Pull Request Process

1. Create feature branch from `develop`
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. Make changes and commit
```bash
git add .
git commit -m "feat: add character emotion preview"
```

3. Push to remote
```bash
git push origin feature/your-feature-name
```

4. Create Pull Request on GitHub
   - Title: Clear description of changes
   - Description: What, why, and how
   - Link related issues
   - Add screenshots for UI changes

5. Code Review
   - Address reviewer comments
   - Ensure CI passes
   - Update documentation if needed

6. Merge
   - Squash and merge to `develop`
   - Delete feature branch

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add character emotion intensity slider
fix: resolve audio playback stuttering issue
docs: update training workflow documentation
style: format code with prettier
refactor: simplify synthesis parameter handling
test: add unit tests for character service
chore: update dependencies
```

---

## Troubleshooting

### Common Issues

**Issue: Frontend can't connect to backend**
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in backend
# Ensure VITE_API_BASE_URL in frontend .env is correct
```

**Issue: GPT-SoVITS training fails with CUDA out of memory**
```python
# Reduce batch size in training config
# Edit: backend/app/services/training_service.py
TRAINING_CONFIG["batch_size"] = 4  # Reduce from 6
```

**Issue: Audio upload fails**
```bash
# Check MAX_UPLOAD_SIZE_MB in backend .env
# Increase if needed: MAX_UPLOAD_SIZE_MB=1000

# Check Nginx config if using reverse proxy
# client_max_body_size 1000M;
```

**Issue: Celery worker not processing training jobs**
```bash
# Check Redis is running
redis-cli ping

# Check Celery worker logs
celery -A app.tasks worker --loglevel=debug

# Verify REDIS_URL in .env is correct
```

---

## Resources

### Documentation

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [GPT-SoVITS GitHub](https://github.com/RVC-Boss/GPT-SoVITS)

### Community

- GitHub Issues: Report bugs and request features
- Discord: Join developer discussions (if available)

---

*For API specifications, see [technical-reference.md](./technical-reference.md)*

*For UI design, see [design-system.md](./design-system.md) and [ui-flowcharts.md](./ui-flowcharts.md)*
