import os
import sys
import json
import uuid
import asyncio
import subprocess
import shutil
import yaml
import glob
import random
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

# Thread pool for running subprocesses on Windows
_executor = ThreadPoolExecutor(max_workers=4)

from ..config import settings
from ..models.training import (
    TrainingProject,
    TrainingStatus,
    TrainingConfig,
    AudioSegment,
    LabelUpdate,
)
from ..models.character import CharacterCreate, ModelPaths
from .character_service import character_service


# GPT-SoVITS version and pretrained model paths
VERSION = "v2Pro"
# Use v2Pro pretrained models (v2Pro has different architecture than v2final)
PRETRAINED_SOVITS_G = "GPT_SoVITS/pretrained_models/v2Pro/s2Gv2Pro.pth"
PRETRAINED_SOVITS_D = "GPT_SoVITS/pretrained_models/v2Pro/s2Dv2Pro.pth"
# GPT model uses the s1v3 checkpoint for v2Pro
PRETRAINED_GPT = "GPT_SoVITS/pretrained_models/s1v3.ckpt"
BERT_PRETRAINED_DIR = "GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large"
SSL_PRETRAINED_DIR = "GPT_SoVITS/pretrained_models/chinese-hubert-base"
SV_PATH = "GPT_SoVITS/pretrained_models/sv/pretrained_eres2netv2w24s4ep4.ckpt"


def get_gptsovits_python(gptsovits_path: Path) -> str:
    """Get the path to the GPT-SoVITS bundled Python runtime."""
    # Check for bundled runtime first (Windows distribution)
    runtime_python = gptsovits_path / "runtime" / "python.exe"
    if runtime_python.exists():
        return str(runtime_python)
    # Fall back to system Python
    return sys.executable


def _run_subprocess_sync(cmd: List[str], cwd: str = None, env: dict = None) -> tuple:
    """Run a subprocess synchronously and return (returncode, stdout, stderr)."""
    try:
        # Set up environment with UTF-8 encoding to avoid Windows encoding issues
        run_env = os.environ.copy()
        run_env["PYTHONIOENCODING"] = "utf-8"
        run_env["PYTHONUTF8"] = "1"
        if env:
            run_env.update(env)

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            env=run_env,
            shell=False,
        )
        stdout, stderr = process.communicate()
        return process.returncode, stdout, stderr
    except FileNotFoundError as e:
        # Return error code if command not found
        return -1, b"", f"Command not found: {cmd[0]} - {str(e)}".encode()


async def run_subprocess(cmd: List[str], cwd: str = None, env: dict = None) -> tuple:
    """Run a subprocess asynchronously using thread pool (Windows compatible)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_subprocess_sync, cmd, cwd, env)


class TrainingService:
    def __init__(self):
        self.projects_dir = settings.data_dir / "training_projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self._active_processes: Dict[str, subprocess.Popen] = {}

    def _get_project_path(self, project_id: str) -> Path:
        return self.projects_dir / project_id

    def _get_project_file(self, project_id: str) -> Path:
        return self._get_project_path(project_id) / "project.json"

    def _save_project(self, project: TrainingProject):
        project_dir = self._get_project_path(project.id)
        project_dir.mkdir(parents=True, exist_ok=True)
        with open(self._get_project_file(project.id), "w", encoding="utf-8") as f:
            json.dump(project.model_dump(), f, indent=2)

    def _load_project(self, project_id: str) -> Optional[TrainingProject]:
        project_file = self._get_project_file(project_id)
        if not project_file.exists():
            return None
        with open(project_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return TrainingProject(**data)

    def list_projects(self) -> List[TrainingProject]:
        projects = []
        for project_dir in self.projects_dir.iterdir():
            if project_dir.is_dir():
                project = self._load_project(project_dir.name)
                if project:
                    projects.append(project)
        return sorted(projects, key=lambda p: p.created_at or "", reverse=True)

    def get_project(self, project_id: str) -> Optional[TrainingProject]:
        return self._load_project(project_id)

    def create_project(self, config: TrainingConfig) -> TrainingProject:
        project_id = str(uuid.uuid4())[:8]
        project_dir = self._get_project_path(project_id)

        project = TrainingProject(
            id=project_id,
            name=config.name,
            language=config.language,
            status=TrainingStatus.PENDING,
            project_dir=str(project_dir),
            raw_audio_dir=str(project_dir / "raw"),
            vocals_dir=str(project_dir / "vocals"),
            sliced_dir=str(project_dir / "sliced"),
            # GPT training params
            gpt_epochs=config.gpt_epochs,
            gpt_batch_size=config.gpt_batch_size,
            gpt_save_every=config.gpt_save_every,
            gpt_dpo_training=config.gpt_dpo_training,
            # SoVITS training params
            sovits_epochs=config.sovits_epochs,
            sovits_batch_size=config.sovits_batch_size,
            sovits_save_every=config.sovits_save_every,
            sovits_text_lr_weight=config.sovits_text_lr_weight,
            created_at=datetime.now().isoformat(),
        )

        # Create directories
        (project_dir / "raw").mkdir(parents=True, exist_ok=True)
        (project_dir / "vocals").mkdir(parents=True, exist_ok=True)
        (project_dir / "sliced").mkdir(parents=True, exist_ok=True)
        (project_dir / "output").mkdir(parents=True, exist_ok=True)

        self._save_project(project)
        return project

    def delete_project(self, project_id: str) -> bool:
        project_dir = self._get_project_path(project_id)
        if project_dir.exists():
            import shutil
            shutil.rmtree(project_dir)
            return True
        return False

    async def upload_audio(self, project_id: str, filename: str, content: bytes) -> bool:
        project = self._load_project(project_id)
        if not project:
            return False

        project.status = TrainingStatus.UPLOADING
        self._save_project(project)

        raw_dir = Path(project.raw_audio_dir)
        filepath = raw_dir / filename
        with open(filepath, "wb") as f:
            f.write(content)

        return True

    def update_project_status(
        self,
        project_id: str,
        status: TrainingStatus,
        progress: float = None,
        current_step: str = None,
        error: str = None,
    ):
        project = self._load_project(project_id)
        if project:
            project.status = status
            if progress is not None:
                project.progress = progress
            if current_step is not None:
                project.current_step = current_step
            if error is not None:
                project.error = error
            self._save_project(project)

    async def _create_character_from_project(
        self,
        project: TrainingProject,
        gpt_model_path: str,
        sovits_model_path: str
    ):
        """Automatically create a character from a completed training project."""
        try:
            # Create character without default reference audio
            # User can upload their own reference audio during synthesis
            model_paths = ModelPaths(
                sovits_model=sovits_model_path,
                gpt_model=gpt_model_path,
                reference_audio=None,
                reference_text=None
            )

            character_data = CharacterCreate(
                name=project.name,
                language=project.language,
                model_paths=model_paths
            )

            character = character_service.create(character_data)
            print(f"Automatically created character '{character.name}' (ID: {character.id}) from training project")

            # Generate preview audio using a random slice sample
            await self._generate_preview_audio(character, project)

        except Exception as e:
            # Don't fail the training if character creation fails
            print(f"Warning: Failed to auto-create character: {e}")

    async def _generate_preview_audio(self, character, project: TrainingProject):
        """Generate a preview audio for the character using a random slice sample."""
        try:
            from .gptsovits_service import gptsovits_service

            # Get slice samples directory
            samples_dir = settings.data_dir / "slice_samples" / project.name
            if not samples_dir.exists():
                print(f"No slice samples found for preview generation")
                return

            # Get all sample files
            sample_files = list(samples_dir.glob("*.wav"))
            if not sample_files:
                print(f"No sample WAV files found in {samples_dir}")
                return

            # Pick a random sample as reference audio
            ref_audio = random.choice(sample_files)
            print(f"Using {ref_audio.name} as reference for preview generation")

            # Determine preview text based on character's language
            lang = project.language.lower()
            if lang in ['zh', 'zh_cn']:
                preview_text = "你好！歡迎使用聲音煉金術。"
                text_lang = "zh"
            elif lang == 'yue':
                preview_text = "你好！歡迎使用聲音煉金術。"
                text_lang = "yue"
            elif lang in ['ja', 'ja_jp']:
                preview_text = "こんにちは！ボーカルアルケミーへようこそ。"
                text_lang = "ja"
            elif lang in ['ko', 'ko_kr']:
                preview_text = "안녕하세요! 보컬 알케미에 오신 것을 환영합니다."
                text_lang = "ko"
            else:
                # Default to English
                preview_text = "Hello! Welcome to Vocal Alchemy."
                text_lang = "en"

            # Generate preview audio
            success, msg, audio_bytes = await gptsovits_service.synthesize(
                character=character,
                text=preview_text,
                text_lang=text_lang,
                ref_audio_path=str(ref_audio),
                prompt_text="",  # Empty prompt text for slice sample
                prompt_lang=text_lang,
                top_k=15,
                top_p=1.0,
                temperature=0.7,
                speed_factor=1.0,
            )

            if success and audio_bytes:
                # Save preview audio
                preview_dir = settings.data_dir / "previews"
                preview_dir.mkdir(parents=True, exist_ok=True)
                preview_path = preview_dir / f"{character.id}_preview.wav"
                with open(preview_path, "wb") as f:
                    f.write(audio_bytes)
                print(f"Generated preview audio: {preview_path}")
            else:
                print(f"Failed to generate preview audio: {msg}")

        except Exception as e:
            # Don't fail if preview generation fails
            print(f"Warning: Failed to generate preview audio: {e}")

    async def run_preprocessing(self, project_id: str, config: TrainingConfig):
        """Run the full preprocessing pipeline."""
        project = self._load_project(project_id)
        if not project:
            return

        gptsovits_path = Path(settings.gptsovits_base_path)

        try:
            # Step 1: Vocal Separation (UVR5)
            if config.remove_bgm:
                self.update_project_status(
                    project_id,
                    TrainingStatus.SEPARATING_VOCALS,
                    progress=10,
                    current_step="Separating vocals from background music..."
                )
                await self._run_uvr5(project, gptsovits_path)

            # Step 2: Slice audio
            if config.auto_slice:
                self.update_project_status(
                    project_id,
                    TrainingStatus.SLICING,
                    progress=30,
                    current_step="Slicing audio into segments..."
                )
                await self._run_slicer(project, config, gptsovits_path)

            # Step 3: ASR Transcription
            if config.auto_transcribe:
                self.update_project_status(
                    project_id,
                    TrainingStatus.TRANSCRIBING,
                    progress=50,
                    current_step="Transcribing audio segments..."
                )
                await self._run_asr(project, gptsovits_path)

            # Load segments for labeling
            await self._load_segments(project)

            # Set status to labeling (waiting for user review)
            self.update_project_status(
                project_id,
                TrainingStatus.LABELING,
                progress=70,
                current_step="Ready for label review"
            )

        except Exception as e:
            self.update_project_status(
                project_id,
                TrainingStatus.FAILED,
                error=str(e)
            )
            raise

    async def _run_uvr5(self, project: TrainingProject, gptsovits_path: Path):
        """Run UVR5 vocal separation."""
        # For now, copy raw files to vocals dir (UVR5 integration is complex)
        # In production, this would call the UVR5 tool
        raw_dir = Path(project.raw_audio_dir)
        vocals_dir = Path(project.vocals_dir)

        for audio_file in raw_dir.iterdir():
            if audio_file.suffix.lower() in ['.wav', '.mp3', '.flac', '.mp4', '.m4a']:
                output_file = vocals_dir / f"{audio_file.stem}.wav"

                # If already WAV, just copy it
                if audio_file.suffix.lower() == '.wav':
                    shutil.copy2(str(audio_file), str(output_file))
                    continue

                # Try to use ffmpeg to convert non-wav files
                cmd = [
                    "ffmpeg", "-i", str(audio_file),
                    "-vn", "-acodec", "pcm_s16le",
                    "-ar", "44100", "-ac", "1",
                    str(output_file), "-y"
                ]
                returncode, stdout, stderr = await run_subprocess(cmd)
                if returncode != 0:
                    print(f"ffmpeg warning: {stderr.decode('utf-8', errors='replace')}")
                    # If ffmpeg fails or not found, copy the file with wav extension
                    # This might not work properly but allows the pipeline to continue
                    shutil.copy2(str(audio_file), str(output_file))

    async def _run_slicer(self, project: TrainingProject, config: TrainingConfig, gptsovits_path: Path):
        """Run audio slicer."""
        vocals_dir = Path(project.vocals_dir)
        sliced_dir = Path(project.sliced_dir)

        # Call the slice_audio.py script
        slicer_script = gptsovits_path / "tools" / "slice_audio.py"
        python_exe = get_gptsovits_python(gptsovits_path)

        for audio_file in vocals_dir.iterdir():
            if audio_file.suffix.lower() == '.wav':
                cmd = [
                    python_exe, str(slicer_script),
                    str(audio_file),  # input
                    str(sliced_dir),  # output
                    str(config.slice_threshold),
                    str(config.slice_min_length),
                    str(config.slice_min_interval),
                    str(config.slice_hop_size),
                    str(config.slice_max_sil_kept),
                    "0.9",  # max
                    "0.25",  # alpha
                    "0",  # i_part
                    "1",  # all_part
                ]

                returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path))
                if returncode != 0:
                    print(f"Slicer error: {stderr.decode('utf-8', errors='replace')}")

        # Save 10 random sliced samples permanently
        self._save_random_slice_samples(project)

    def _save_random_slice_samples(self, project: TrainingProject, num_samples: int = 10):
        """Save random sliced audio samples permanently for later reference."""
        sliced_dir = Path(project.sliced_dir)

        # Get all sliced wav files
        sliced_files = list(sliced_dir.glob("*.wav"))
        if not sliced_files:
            print(f"No sliced files found to save samples from")
            return

        # Create permanent samples directory
        samples_dir = settings.data_dir / "slice_samples" / project.name
        samples_dir.mkdir(parents=True, exist_ok=True)

        # Select random samples (up to num_samples or all if fewer available)
        num_to_save = min(num_samples, len(sliced_files))
        selected_files = random.sample(sliced_files, num_to_save)

        # Copy selected files to samples directory
        for i, src_file in enumerate(selected_files, 1):
            dst_file = samples_dir / f"sample_{i:02d}_{src_file.name}"
            shutil.copy2(src_file, dst_file)
            print(f"Saved slice sample: {dst_file.name}")

        print(f"Saved {num_to_save} random slice samples to {samples_dir}")

    async def _run_asr(self, project: TrainingProject, gptsovits_path: Path):
        """Run ASR transcription."""
        sliced_dir = Path(project.sliced_dir)
        output_dir = Path(project.project_dir) / "asr_output"
        output_dir.mkdir(exist_ok=True)

        # Check if there are any sliced files to transcribe
        sliced_files = list(sliced_dir.glob("*.wav"))
        if not sliced_files:
            print(f"No sliced WAV files found in {sliced_dir}, skipping ASR")
            return

        print(f"Found {len(sliced_files)} sliced files to transcribe")

        asr_script = gptsovits_path / "tools" / "asr" / "fasterwhisper_asr.py"
        python_exe = get_gptsovits_python(gptsovits_path)

        # Map language code
        lang_map = {
            "en": "en", "en_US": "en",
            "zh": "zh", "zh_CN": "zh",
            "ja": "ja", "ja_JP": "ja",
            "ko": "ko", "ko_KR": "ko",
            "yue": "yue",
        }
        lang = lang_map.get(project.language, "auto")

        # Check if CUDA is available for precision selection
        # float16 requires CUDA, use int8 for CPU (faster than float32)
        try:
            import torch
            precision = "float16" if torch.cuda.is_available() else "int8"
        except ImportError:
            precision = "int8"  # Default to int8 if torch not available

        cmd = [
            python_exe, str(asr_script),
            "-i", str(sliced_dir),
            "-o", str(output_dir),
            "-s", "large-v3",
            "-l", lang,
            "-p", precision,
        ]

        print(f"Running ASR: {' '.join(cmd)}")
        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path))
        stdout_str = stdout.decode('utf-8', errors='replace')
        stderr_str = stderr.decode('utf-8', errors='replace')

        if stdout_str:
            print(f"ASR stdout: {stdout_str}")
        if returncode != 0:
            print(f"ASR error (code {returncode}): {stderr_str}")

        # Check if .list file was created
        expected_list = output_dir / f"{sliced_dir.name}.list"
        if expected_list.exists():
            print(f"ASR output created: {expected_list}")
        else:
            print(f"ASR did not create expected output: {expected_list}")

    async def _load_segments(self, project: TrainingProject):
        """Load transcribed segments from .list files or audio directories."""
        segments = []
        list_file_path = None

        # Priority 1: Check output directory for .list files (GPT-SoVITS format)
        output_dir = Path(project.project_dir) / "output"
        if output_dir.exists():
            for list_file in output_dir.glob("**/*.list"):
                print(f"Found .list file: {list_file}")
                segments.extend(self._parse_list_file(list_file, project))
                if not list_file_path:
                    list_file_path = str(list_file)

        # Priority 2: Check asr_output directory for .list files
        if not segments:
            asr_output_dir = Path(project.project_dir) / "asr_output"
            if asr_output_dir.exists():
                for list_file in asr_output_dir.glob("*.list"):
                    print(f"Found ASR .list file: {list_file}")
                    segments.extend(self._parse_list_file(list_file, project))
                    if not list_file_path:
                        list_file_path = str(list_file)

        # Priority 3: Create segments from sliced files (no transcription)
        if not segments:
            sliced_dir = Path(project.sliced_dir)
            for audio_file in sorted(sliced_dir.glob("*.wav")):
                segment = AudioSegment(
                    id=str(uuid.uuid4())[:8],
                    filename=audio_file.name,
                    filepath=str(audio_file),
                    text="",  # Empty - user needs to transcribe
                    language=project.language,
                )
                segments.append(segment)

        # Priority 4: Fall back to vocals directory (slicing may have failed)
        if not segments:
            vocals_dir = Path(project.vocals_dir)
            print(f"No sliced files found, falling back to vocals directory: {vocals_dir}")
            for audio_file in sorted(vocals_dir.glob("*.wav")):
                segment = AudioSegment(
                    id=str(uuid.uuid4())[:8],
                    filename=audio_file.name,
                    filepath=str(audio_file),
                    text="",  # Empty - user needs to transcribe
                    language=project.language,
                )
                segments.append(segment)

        print(f"Loaded {len(segments)} segments for labeling")
        project.segments = segments
        project.list_file_path = list_file_path
        self._save_project(project)

    def _parse_list_file(self, list_file: Path, project: TrainingProject) -> List[AudioSegment]:
        """Parse a .list file and return AudioSegments."""
        segments = []
        try:
            with open(list_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    # Format: filepath|name|LANG|text
                    parts = line.split("|")
                    if len(parts) >= 4:
                        filepath, name, lang, text = parts[0], parts[1], parts[2], parts[3]
                        segment = AudioSegment(
                            id=str(uuid.uuid4())[:8],
                            filename=os.path.basename(filepath),
                            filepath=filepath,
                            text=text,
                            language=lang.lower(),
                        )
                        segments.append(segment)
        except Exception as e:
            print(f"Error parsing {list_file}: {e}")
        return segments

    def import_list_file(self, project_id: str, list_file: Path) -> int:
        """Import segments from an external .list file."""
        project = self._load_project(project_id)
        if not project:
            return 0

        segments = self._parse_list_file(list_file, project)
        if segments:
            project.segments = segments
            project.status = TrainingStatus.LABELING
            project.progress = 70
            project.current_step = "Ready for label review"
            self._save_project(project)
            print(f"Imported {len(segments)} segments from {list_file}")

        return len(segments)

    def update_segment_label(self, project_id: str, update: LabelUpdate) -> bool:
        """Update a segment's transcription."""
        project = self._load_project(project_id)
        if not project:
            return False

        for segment in project.segments:
            if segment.id == update.id:
                segment.text = update.text
                if update.language:
                    segment.language = update.language
                self._save_project(project)
                return True
        return False

    def update_all_labels(self, project_id: str, updates: List[LabelUpdate]) -> bool:
        """Update multiple segment labels at once."""
        project = self._load_project(project_id)
        if not project:
            return False

        updates_map = {u.id: u for u in updates}
        for segment in project.segments:
            if segment.id in updates_map:
                update = updates_map[segment.id]
                segment.text = update.text
                if update.language:
                    segment.language = update.language

        self._save_project(project)
        return True

    def delete_segment(self, project_id: str, segment_id: str) -> bool:
        """Delete a segment from the project."""
        project = self._load_project(project_id)
        if not project:
            return False

        project.segments = [s for s in project.segments if s.id != segment_id]
        self._save_project(project)
        return True

    def _cleanup_training_files(self, project_id: str):
        """Clean up temporary training files after training completes.

        Removes:
        - raw/ - Original uploaded files
        - vocals/ - Separated vocal tracks
        - sliced/ - Sliced audio segments
        - asr_output/ - ASR transcription output
        - output/ - Intermediate training data (keeps only final models)
        - tmp_*.yaml, tmp_*.json - Temporary config files

        Keeps:
        - project.json - Project metadata
        - Final trained models (stored in data/models/)
        """
        project_dir = self._get_project_path(project_id)

        # Directories to remove
        dirs_to_remove = ["raw", "vocals", "sliced", "asr_output", "output"]
        for dir_name in dirs_to_remove:
            dir_path = project_dir / dir_name
            if dir_path.exists():
                try:
                    shutil.rmtree(dir_path)
                    print(f"Cleaned up: {dir_path}")
                except Exception as e:
                    print(f"Failed to clean up {dir_path}: {e}")

        # Remove temporary config files
        for pattern in ["tmp_*.yaml", "tmp_*.json"]:
            for tmp_file in project_dir.glob(pattern):
                try:
                    tmp_file.unlink()
                    print(f"Cleaned up: {tmp_file}")
                except Exception as e:
                    print(f"Failed to clean up {tmp_file}: {e}")

        # Clear segments from project (no longer needed)
        project = self._load_project(project_id)
        if project:
            project.segments = []
            self._save_project(project)

        print(f"Training cleanup completed for project {project_id}")

    async def start_training(self, project_id: str):
        """Start the actual model training."""
        project = self._load_project(project_id)
        if not project:
            return

        gptsovits_path = Path(settings.gptsovits_base_path)

        try:
            # Generate training files
            self.update_project_status(
                project_id,
                TrainingStatus.PREPARING,
                progress=75,
                current_step="Preparing training data..."
            )
            await self._prepare_training_data(project, gptsovits_path)

            # Train GPT model
            self.update_project_status(
                project_id,
                TrainingStatus.TRAINING_GPT,
                progress=80,
                current_step="Training GPT model..."
            )
            await self._train_gpt(project, gptsovits_path)

            # Train SoVITS model
            self.update_project_status(
                project_id,
                TrainingStatus.TRAINING_SOVITS,
                progress=90,
                current_step="Training SoVITS model..."
            )
            await self._train_sovits(project, gptsovits_path)

            # Update model paths
            project = self._load_project(project_id)
            if project:
                gpt_model_path = str(settings.models_dir / "GPT_weights" / f"{project.name}-e{project.gpt_epochs}.ckpt")
                sovits_pattern = str(settings.models_dir / "SoVITS_weights" / f"{project.name}_e{project.sovits_epochs}_s*.pth")

                # Resolve the wildcard to find the actual SoVITS model file
                sovits_matches = glob.glob(sovits_pattern)
                sovits_model_path = sovits_matches[0] if sovits_matches else sovits_pattern

                project.gpt_model_path = gpt_model_path
                project.sovits_model_path = sovits_model_path
                project.status = TrainingStatus.COMPLETED
                project.progress = 100
                project.current_step = "Training completed!"
                self._save_project(project)

                # Automatically create a character with the trained models and generate preview
                await self._create_character_from_project(project, gpt_model_path, sovits_model_path)

            # Clean up temporary training files
            self._cleanup_training_files(project_id)

        except Exception as e:
            self.update_project_status(
                project_id,
                TrainingStatus.FAILED,
                error=str(e)
            )
            raise

    async def _prepare_training_data(self, project: TrainingProject, gptsovits_path: Path):
        """Prepare training data files (equivalent to open1abc)."""
        output_dir = Path(project.project_dir) / "output"
        exp_dir = output_dir / project.name
        exp_dir.mkdir(parents=True, exist_ok=True)

        # Create the .list file from labeled segments
        list_file = exp_dir / f"{project.name}.list"
        with open(list_file, "w", encoding="utf-8") as f:
            for segment in project.segments:
                if segment.text.strip():
                    # Format: filepath|speaker|lang|text
                    f.write(f"{segment.filepath}|{project.name}|{segment.language.upper()}|{segment.text}\n")

        # Step 1A: Get text/phoneme data (1-get-text.py)
        self.update_project_status(
            project.id,
            TrainingStatus.PREPARING,
            progress=76,
            current_step="Processing text and phonemes (1A)..."
        )
        await self._run_get_text(project, exp_dir, gptsovits_path)

        # Step 1B: Get hubert features (2-get-hubert-wav32k.py)
        self.update_project_status(
            project.id,
            TrainingStatus.PREPARING,
            progress=77,
            current_step="Extracting audio features (1B)..."
        )
        await self._run_get_hubert(project, exp_dir, gptsovits_path)

        # Step 1B2: Get speaker verification embeddings (2-get-sv.py) - only for v2Pro
        if VERSION in ("v2Pro", "v2ProPlus"):
            self.update_project_status(
                project.id,
                TrainingStatus.PREPARING,
                progress=78,
                current_step="Extracting speaker embeddings (1B2)..."
            )
            await self._run_get_sv(project, exp_dir, gptsovits_path)

        # Step 1C: Get semantic features (3-get-semantic.py)
        self.update_project_status(
            project.id,
            TrainingStatus.PREPARING,
            progress=80,
            current_step="Extracting semantic features (1C)..."
        )
        await self._run_get_semantic(project, exp_dir, gptsovits_path)

    async def _run_get_text(self, project: TrainingProject, exp_dir: Path, gptsovits_path: Path):
        """Run 1-get-text.py to process phonemes."""
        inp_text = exp_dir / f"{project.name}.list"
        inp_wav_dir = Path(project.sliced_dir)
        python_exe = get_gptsovits_python(gptsovits_path)

        env = os.environ.copy()
        env.update({
            "inp_text": str(inp_text),
            "inp_wav_dir": str(inp_wav_dir),
            "exp_name": project.name,
            "opt_dir": str(exp_dir),
            "bert_pretrained_dir": str(gptsovits_path / BERT_PRETRAINED_DIR),
            "is_half": "True",
            "i_part": "0",
            "all_parts": "1",
            "_CUDA_VISIBLE_DEVICES": "0",
        })

        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "prepare_datasets" / "1-get-text.py")]
        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        if returncode != 0:
            print(f"1-get-text.py error: {stderr.decode('utf-8', errors='replace')}")

        # Merge output files
        path_text = exp_dir / "2-name2text.txt"
        txt_path_0 = exp_dir / "2-name2text-0.txt"
        if txt_path_0.exists():
            shutil.move(str(txt_path_0), str(path_text))

    async def _run_get_hubert(self, project: TrainingProject, exp_dir: Path, gptsovits_path: Path):
        """Run 2-get-hubert-wav32k.py to extract audio features."""
        inp_text = exp_dir / f"{project.name}.list"
        inp_wav_dir = Path(project.sliced_dir)
        python_exe = get_gptsovits_python(gptsovits_path)

        env = os.environ.copy()
        env.update({
            "inp_text": str(inp_text),
            "inp_wav_dir": str(inp_wav_dir),
            "exp_name": project.name,
            "opt_dir": str(exp_dir),
            "cnhubert_base_dir": str(gptsovits_path / SSL_PRETRAINED_DIR),
            "sv_path": str(gptsovits_path / SV_PATH),
            "i_part": "0",
            "all_parts": "1",
            "_CUDA_VISIBLE_DEVICES": "0",
        })

        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "prepare_datasets" / "2-get-hubert-wav32k.py")]
        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        if returncode != 0:
            print(f"2-get-hubert-wav32k.py error: {stderr.decode('utf-8', errors='replace')}")

    async def _run_get_sv(self, project: TrainingProject, exp_dir: Path, gptsovits_path: Path):
        """Run 2-get-sv.py to extract speaker verification embeddings (required for v2Pro)."""
        inp_text = exp_dir / f"{project.name}.list"
        inp_wav_dir = Path(project.sliced_dir)
        python_exe = get_gptsovits_python(gptsovits_path)

        # Check if CUDA is available for half precision
        try:
            import torch
            is_half = "True" if torch.cuda.is_available() else "False"
        except ImportError:
            is_half = "False"

        env = os.environ.copy()
        env.update({
            "inp_text": str(inp_text),
            "inp_wav_dir": str(inp_wav_dir),
            "exp_name": project.name,
            "opt_dir": str(exp_dir),
            "sv_path": str(gptsovits_path / SV_PATH),
            "is_half": is_half,
            "i_part": "0",
            "all_parts": "1",
            "_CUDA_VISIBLE_DEVICES": "0" if is_half == "True" else "",
        })

        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "prepare_datasets" / "2-get-sv.py")]
        print(f"Running speaker verification extraction: {' '.join(cmd)}")
        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        if returncode != 0:
            print(f"2-get-sv.py error: {stderr.decode('utf-8', errors='replace')}")
        else:
            print(f"Speaker verification extraction completed")

    async def _run_get_semantic(self, project: TrainingProject, exp_dir: Path, gptsovits_path: Path):
        """Run 3-get-semantic.py to extract semantic features."""
        inp_text = exp_dir / f"{project.name}.list"
        config_file = "GPT_SoVITS/configs/s2v2Pro.json" if VERSION == "v2Pro" else "GPT_SoVITS/configs/s2.json"
        python_exe = get_gptsovits_python(gptsovits_path)

        env = os.environ.copy()
        env.update({
            "inp_text": str(inp_text),
            "exp_name": project.name,
            "opt_dir": str(exp_dir),
            "pretrained_s2G": str(gptsovits_path / PRETRAINED_SOVITS_G),
            "s2config_path": config_file,
            "i_part": "0",
            "all_parts": "1",
            "_CUDA_VISIBLE_DEVICES": "0",
        })

        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "prepare_datasets" / "3-get-semantic.py")]
        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        if returncode != 0:
            print(f"3-get-semantic.py error: {stderr.decode('utf-8', errors='replace')}")

        # Merge output files
        path_semantic = exp_dir / "6-name2semantic.tsv"
        semantic_path_0 = exp_dir / "6-name2semantic-0.tsv"
        if semantic_path_0.exists():
            with open(path_semantic, "w", encoding="utf-8") as f:
                f.write("item_name\tsemantic_audio\n")
                with open(semantic_path_0, "r", encoding="utf-8") as f0:
                    f.write(f0.read())
            semantic_path_0.unlink()

    async def _train_gpt(self, project: TrainingProject, gptsovits_path: Path):
        """Train the GPT (s1) model."""
        exp_dir = Path(project.project_dir) / "output" / project.name
        python_exe = get_gptsovits_python(gptsovits_path)

        # Load and modify config
        config_template = "GPT_SoVITS/configs/s1longer-v2.yaml" if VERSION != "v1" else "GPT_SoVITS/configs/s1longer.yaml"
        with open(gptsovits_path / config_template, "r") as f:
            config = yaml.safe_load(f)

        # Update config with project settings
        config["train"]["batch_size"] = project.gpt_batch_size
        config["train"]["epochs"] = project.gpt_epochs
        config["train"]["save_every_n_epoch"] = project.gpt_save_every
        config["train"]["if_save_every_weights"] = True
        config["train"]["if_save_latest"] = True
        config["train"]["if_dpo"] = project.gpt_dpo_training
        config["train"]["half_weights_save_dir"] = str(settings.models_dir / "GPT_weights")
        config["train"]["exp_name"] = project.name
        config["pretrained_s1"] = str(gptsovits_path / PRETRAINED_GPT)
        config["train_semantic_path"] = str(exp_dir / "6-name2semantic.tsv")
        config["train_phoneme_path"] = str(exp_dir / "2-name2text.txt")
        config["output_dir"] = str(exp_dir / f"logs_s1_{VERSION}")

        # Check if CUDA is available for GPU training
        try:
            import torch
            has_cuda = torch.cuda.is_available()
            gpu_id = "0"
            if has_cuda:
                # Find the NVIDIA GPU (skip integrated graphics like Intel HD)
                for i in range(torch.cuda.device_count()):
                    name = torch.cuda.get_device_name(i).lower()
                    if "nvidia" in name or "geforce" in name or "rtx" in name or "gtx" in name:
                        gpu_id = str(i)
                        print(f"Found NVIDIA GPU at index {i}: {torch.cuda.get_device_name(i)}")
                        break
        except ImportError:
            has_cuda = False
            gpu_id = "0"

        if has_cuda:
            # GPU mode with mixed precision
            config["train"]["precision"] = "16-mixed"  # Use mixed precision for faster training
            print(f"GPU detected - using CUDA device {gpu_id} for GPT training")
        else:
            # CPU mode with float32 precision
            config["train"]["precision"] = "32"  # Use float32 for CPU compatibility
            print("No GPU detected - using CPU for GPT training (slower)")

        # Create logs directory
        (exp_dir / f"logs_s1_{VERSION}").mkdir(parents=True, exist_ok=True)

        # Save temp config
        tmp_config = Path(project.project_dir) / "tmp_s1.yaml"
        with open(tmp_config, "w") as f:
            yaml.dump(config, f, default_flow_style=False)

        # Set environment
        env = os.environ.copy()
        if has_cuda:
            env["CUDA_VISIBLE_DEVICES"] = gpu_id  # Use detected NVIDIA GPU
            env["_CUDA_VISIBLE_DEVICES"] = gpu_id
        else:
            env["CUDA_VISIBLE_DEVICES"] = ""  # Disable CUDA
            env["_CUDA_VISIBLE_DEVICES"] = ""
        env["hz"] = "25hz"

        # Run training
        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "s1_train.py"), "--config_file", str(tmp_config)]
        print(f"Running GPT training: {' '.join(cmd)}")

        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        print(f"[GPT] {stdout.decode('utf-8', errors='replace')}")
        if returncode != 0:
            raise Exception(f"GPT training failed: {stderr.decode('utf-8', errors='replace')}")

    async def _train_sovits(self, project: TrainingProject, gptsovits_path: Path):
        """Train the SoVITS (s2) model."""
        exp_dir = Path(project.project_dir) / "output" / project.name
        python_exe = get_gptsovits_python(gptsovits_path)

        # Load and modify config
        config_file = "GPT_SoVITS/configs/s2v2Pro.json" if VERSION == "v2Pro" else "GPT_SoVITS/configs/s2.json"
        with open(gptsovits_path / config_file, "r") as f:
            config = json.load(f)

        # Update config with project settings
        config["train"]["batch_size"] = project.sovits_batch_size
        config["train"]["epochs"] = project.sovits_epochs
        config["train"]["save_every_epoch"] = project.sovits_save_every
        config["train"]["if_save_every_weights"] = True
        config["train"]["if_save_latest"] = True
        config["train"]["text_low_lr_rate"] = project.sovits_text_lr_weight
        config["train"]["pretrained_s2G"] = str(gptsovits_path / PRETRAINED_SOVITS_G)
        config["train"]["pretrained_s2D"] = str(gptsovits_path / PRETRAINED_SOVITS_D)

        # Check if CUDA is available for GPU training
        try:
            import torch
            has_cuda = torch.cuda.is_available()
            gpu_id = "0"
            if has_cuda:
                # Find the NVIDIA GPU (skip integrated graphics like Intel HD)
                for i in range(torch.cuda.device_count()):
                    name = torch.cuda.get_device_name(i).lower()
                    if "nvidia" in name or "geforce" in name or "rtx" in name or "gtx" in name:
                        gpu_id = str(i)
                        print(f"Found NVIDIA GPU at index {i}: {torch.cuda.get_device_name(i)}")
                        break
        except ImportError:
            has_cuda = False
            gpu_id = "0"

        if has_cuda:
            config["train"]["gpu_numbers"] = gpu_id  # Use detected NVIDIA GPU
            config["train"]["fp16_run"] = True  # Enable fp16 for faster training
            print(f"GPU detected - using CUDA device {gpu_id} for SoVITS training")
        else:
            config["train"]["gpu_numbers"] = ""  # Empty for CPU training
            config["train"]["fp16_run"] = False  # Disable fp16 for CPU
            print("No GPU detected - using CPU for SoVITS training (slower)")

        config["model"]["version"] = VERSION
        config["data"]["exp_dir"] = str(exp_dir)
        config["s2_ckpt_dir"] = str(exp_dir)
        config["save_weight_dir"] = str(settings.models_dir / "SoVITS_weights")
        config["name"] = project.name
        config["version"] = VERSION

        # Create logs directory
        (exp_dir / f"logs_s2_{VERSION}").mkdir(parents=True, exist_ok=True)

        # Save temp config
        tmp_config = Path(project.project_dir) / "tmp_s2.json"
        with open(tmp_config, "w") as f:
            json.dump(config, f)

        # Set environment
        env = os.environ.copy()
        if has_cuda:
            env["CUDA_VISIBLE_DEVICES"] = gpu_id  # Use detected NVIDIA GPU
        else:
            env["CUDA_VISIBLE_DEVICES"] = ""  # Disable CUDA

        # Run training
        cmd = [python_exe, str(gptsovits_path / "GPT_SoVITS" / "s2_train.py"), "--config", str(tmp_config)]
        mode_str = "GPU" if has_cuda else "CPU (slower)"
        print(f"Running SoVITS training ({mode_str}): {' '.join(cmd)}")

        returncode, stdout, stderr = await run_subprocess(cmd, cwd=str(gptsovits_path), env=env)
        print(f"[SoVITS] {stdout.decode('utf-8', errors='replace')}")
        if returncode != 0:
            raise Exception(f"SoVITS training failed: {stderr.decode('utf-8', errors='replace')}")


training_service = TrainingService()
