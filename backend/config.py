import os
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv

# Robustly load .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application settings with environment variable support"""

    # Supabase (PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Supabase Auth
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

    # OpenRouter (Alternative AI)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv(
        "OPENROUTER_MODEL", "tngtech/deepseek-r1t2-chimera:free"
    )
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Default AI Provider
    DEFAULT_AI_PROVIDER: str = os.getenv(
        "DEFAULT_AI_PROVIDER", "gemini"
    )  # "gemini" or "openrouter"

    # Chunking Config - Tối ưu cho RAG
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 1000))  # characters per chunk
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 200))  # overlap between chunks

    # Search Config
    MAX_SEARCH_RESULTS: int = int(os.getenv("MAX_SEARCH_RESULTS", 10))
    EMBEDDING_CACHE_SIZE: int = int(os.getenv("EMBEDDING_CACHE_SIZE", 1000))

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

    # Debug mode
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # CORS Origins (comma-separated list)
    # Default includes localhost for development
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost,https://mc-sv-hcmus.duckdns.org"
    ).split(",")

    def validate(self) -> bool:
        """Validate required settings"""
        errors = []
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is required")
        if not self.GEMINI_API_KEY and not self.OPENROUTER_API_KEY:
            errors.append(
                "At least one AI API key is required (GEMINI_API_KEY or OPENROUTER_API_KEY)"
            )
        if not self.SUPABASE_URL:
            errors.append("SUPABASE_URL is required for authentication")
        if not self.SUPABASE_JWT_SECRET:
            errors.append("SUPABASE_JWT_SECRET is required for JWT verification")

        if errors:
            for error in errors:
                print(f"❌ Config Error: {error}")
            return False
        return True

    def get_available_providers(self) -> list:
        """Get list of available AI providers"""
        providers = []
        if self.GEMINI_API_KEY:
            providers.append("gemini")
        if self.OPENROUTER_API_KEY:
            providers.append("openrouter")
        return providers


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
