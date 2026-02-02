import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from ..config import settings
from ..models.character import Character, CharacterCreate, CharacterUpdate, ModelPaths

# Soft delete retention period (7 days)
TRASH_RETENTION_DAYS = 7


# Built-in Default character using pretrained base models
DEFAULT_CHARACTER_ID = "default"


class CharacterService:
    def __init__(self):
        self._ensure_data_dir()
        self._default_character = self._create_default_character()

    def _create_default_character(self) -> Character:
        """Create the built-in Default character using GPT-SoVITS pretrained models."""
        gptsovits_path = Path(settings.gptsovits_base_path)

        # Use v2 pretrained models (most stable)
        gpt_model = gptsovits_path / "GPT_SoVITS" / "pretrained_models" / "gsv-v2final-pretrained" / "s1bert25hz-5kh-longer-epoch=12-step=369668.ckpt"
        sovits_model = gptsovits_path / "GPT_SoVITS" / "pretrained_models" / "gsv-v2final-pretrained" / "s2G2333k.pth"

        # Fall back to v1 if v2 not found
        if not gpt_model.exists():
            gpt_model = gptsovits_path / "GPT_SoVITS" / "pretrained_models" / "s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt"
        if not sovits_model.exists():
            sovits_model = gptsovits_path / "GPT_SoVITS" / "pretrained_models" / "s2G488k.pth"

        return Character(
            id=DEFAULT_CHARACTER_ID,
            name="Default (Zero-shot)",
            language="en",
            status="ready",
            created_at="2024-01-01T00:00:00",
            model_paths=ModelPaths(
                gpt_model=str(gpt_model),
                sovits_model=str(sovits_model),
                reference_audio=None,  # User must provide reference audio
                reference_text=None,
            ),
            version="v2",
        )

    def _ensure_data_dir(self):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        if not settings.characters_file.exists():
            self._save_characters([])

    def _load_characters(self) -> list[Character]:
        if not settings.characters_file.exists():
            return []
        with open(settings.characters_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Character(**c) for c in data]

    def _save_characters(self, characters: list[Character]):
        with open(settings.characters_file, "w", encoding="utf-8") as f:
            json.dump([c.model_dump() for c in characters], f, indent=2)

    def get_all(self, include_deleted: bool = False) -> list[Character]:
        """Get all characters including the built-in Default.

        Args:
            include_deleted: If True, include soft-deleted characters. Default False.
        """
        characters = self._load_characters()

        # Filter out deleted characters unless requested
        if not include_deleted:
            characters = [c for c in characters if c.deleted_at is None]

        # Add Default character at the beginning
        return [self._default_character] + characters

    def get_deleted(self) -> list[Character]:
        """Get all soft-deleted characters (trash)."""
        characters = self._load_characters()
        return [c for c in characters if c.deleted_at is not None]

    def get_by_id(self, character_id: str) -> Optional[Character]:
        # Check for Default character first
        if character_id == DEFAULT_CHARACTER_ID:
            return self._default_character

        characters = self._load_characters()
        for c in characters:
            if c.id == character_id:
                return c
        return None

    def create(self, data: CharacterCreate) -> Character:
        characters = self._load_characters()

        character = Character(
            id=str(uuid.uuid4())[:8],
            name=data.name,
            language=data.language,
            model_paths=data.model_paths,
            status="ready",
            created_at=datetime.now().isoformat(),
        )

        characters.append(character)
        self._save_characters(characters)
        return character

    def update(self, character_id: str, data: CharacterUpdate) -> Optional[Character]:
        characters = self._load_characters()

        for i, c in enumerate(characters):
            if c.id == character_id:
                update_data = data.model_dump(exclude_unset=True)
                updated = c.model_copy(update=update_data)
                characters[i] = updated
                self._save_characters(characters)
                return updated

        return None

    def delete(self, character_id: str) -> bool:
        """Soft delete a character (move to trash)."""
        # Cannot delete the Default character
        if character_id == DEFAULT_CHARACTER_ID:
            return False

        characters = self._load_characters()

        for i, c in enumerate(characters):
            if c.id == character_id and c.deleted_at is None:
                # Soft delete by setting deleted_at timestamp
                updated = c.model_copy(update={"deleted_at": datetime.now().isoformat()})
                characters[i] = updated
                self._save_characters(characters)
                return True

        return False

    def restore(self, character_id: str) -> Optional[Character]:
        """Restore a soft-deleted character from trash."""
        characters = self._load_characters()

        for i, c in enumerate(characters):
            if c.id == character_id and c.deleted_at is not None:
                # Restore by clearing deleted_at
                updated = c.model_copy(update={"deleted_at": None})
                characters[i] = updated
                self._save_characters(characters)
                return updated

        return None

    def permanent_delete(self, character_id: str) -> bool:
        """Permanently delete a character (cannot be recovered)."""
        # Cannot delete the Default character
        if character_id == DEFAULT_CHARACTER_ID:
            return False

        characters = self._load_characters()
        initial_count = len(characters)

        characters = [c for c in characters if c.id != character_id]

        if len(characters) < initial_count:
            self._save_characters(characters)
            return True
        return False

    def cleanup_old_deleted(self) -> int:
        """Permanently delete characters that have been in trash for over 7 days.

        Returns the number of characters permanently deleted.
        """
        characters = self._load_characters()
        now = datetime.now()
        cutoff = now - timedelta(days=TRASH_RETENTION_DAYS)

        to_keep = []
        deleted_count = 0

        for c in characters:
            if c.deleted_at is not None:
                deleted_time = datetime.fromisoformat(c.deleted_at)
                if deleted_time < cutoff:
                    # Character has been deleted for over 7 days, permanently remove
                    deleted_count += 1
                    continue
            to_keep.append(c)

        if deleted_count > 0:
            self._save_characters(to_keep)

        return deleted_count


character_service = CharacterService()
