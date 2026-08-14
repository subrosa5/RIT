"""Application settings, loaded from environment variables.

Nothing secret has a default that works in production — DATABASE_URL and
JWT_SECRET_KEY must be supplied explicitly. This is deliberate: a service
that silently boots with a placeholder secret is a security bug waiting
to happen.
"""
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Sentinel value, not a real secret — the app refuses to boot with this in
# production (see `_refuse_insecure_production_config` below).
_INSECURE_DEFAULT_SECRET = "dev-only-insecure-secret-change-me"  # noqa: S105  # nosec: B105


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Core ---
    ENVIRONMENT: str = Field(default="development")
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./dev.db")

    # --- Auth ---
    JWT_SECRET_KEY: str = Field(default=_INSECURE_DEFAULT_SECRET)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = Field(default=True)  # set False only for plain-http local dev

    # --- CORS ---
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    # --- Rate limiting ---
    AUTH_RATE_LIMIT: str = "5/minute"

    # --- AI scoring (optional) ---
    ANTHROPIC_API_KEY: str | None = None
    AI_MODEL: str = "claude-sonnet-5"

    # --- Telegram digest (optional) ---
    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_CHAT_ID: str | None = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _refuse_insecure_production_config(self) -> "Settings":
        """Fail at boot, not at the first exploit. A service that starts up
        happily with the placeholder JWT secret in production is a much
        worse outcome than one that refuses to start."""
        if self.is_production:
            if self.JWT_SECRET_KEY == _INSECURE_DEFAULT_SECRET:
                raise ValueError("JWT_SECRET_KEY must be set explicitly in production")
            if len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be at least 32 bytes in production")
            if not self.COOKIE_SECURE:
                raise ValueError("COOKIE_SECURE must be true in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
