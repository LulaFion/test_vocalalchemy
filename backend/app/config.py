from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # API Settings
    api_title: str = "VocalAlchemy API"
    api_version: str = "1.0.0"
    debug: bool = True

    # GPT-SoVITS Settings
    gptsovits_host: str = "127.0.0.1"
    gptsovits_port: int = 9880
    gptsovits_base_path: str = "C:/Users/user/Documents/Audio/GPT-SoVITS/GPT-SoVITS-v2pro-20250604"

    # Storage paths
    data_dir: Path = Path(__file__).parent.parent / "data"
    characters_file: Path = Path(__file__).parent.parent / "data" / "characters.json"
    audio_dir: Path = Path(__file__).parent.parent / "data" / "audio"
    models_dir: Path = Path(__file__).parent.parent / "data" / "models"
    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def gptsovits_url(self) -> str:
        return f"http://{self.gptsovits_host}:{self.gptsovits_port}"

    class Config:
        env_prefix = "VOCAL_"


settings = Settings()
