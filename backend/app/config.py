import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Determine root directory & .env location
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
BACKEND_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

# Explicitly load .env into os.environ for all third-party libraries (litellm, etc.)
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
elif BACKEND_ENV_PATH.exists():
    load_dotenv(dotenv_path=BACKEND_ENV_PATH, override=True)
else:
    load_dotenv(override=True)

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 5194
    FRONTEND_PORT: int = 5193
    NEXT_PUBLIC_API_URL: str = "http://localhost:5194/api/v1"
    
    # Security
    SECRET_KEY: str = "verafit-super-secret-jwt-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/verafit.db"
    
    # Third-Party APIs
    YOUCAM_API_KEY: Optional[str] = None
    # Server root; task endpoints are appended per latest API version,
    # e.g. /s2s/v2.1/task/skin-analysis, /s2s/v2.0/task/skin-tone-analysis,
    # /s2s/v2.0/task/<VTO_TASK_PATH> and /s2s/v2.0/file.
    YOUCAM_API_URL: str = "https://yce-api-01.makeupar.com"
    # Latest AI Clothes (garment VTO) task: cloth-v4. Override via env if needed.
    YOUCAM_VTO_TASK_PATH: str = "cloth-v4"
    YOUCAM_TASK_POLL_INTERVAL: float = 2.0
    YOUCAM_TASK_TIMEOUT: float = 180.0
    YOUCAM_MOCK_FALLBACK: bool = True
    
    # LiteLLM Unified Multi-Provider Configuration
    LLM_MODEL: str = "gpt-4o"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OLLAMA_API_BASE: str = "http://localhost:11434"
    
    # Default Image Assets
    DEFAULT_AVATAR_URL: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    DEFAULT_MANNEQUIN_PHOTO_URL: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
    DEFAULT_GARMENT_IMAGE_URL: str = "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80"

    # Algorithmic Parameters
    DEFAULT_WEIGHT_FIT: float = 0.45
    DEFAULT_WEIGHT_COLOR: float = 0.30
    DEFAULT_WEIGHT_FABRIC: float = 0.25
    ALLERGY_PENALTY_MULTIPLIER: float = 0.40
    SSIM_INSTABILITY_THRESHOLD: float = 0.80

    model_config = SettingsConfigDict(
        env_file=[str(ENV_PATH), str(BACKEND_ENV_PATH), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
