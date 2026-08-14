import pytest
from pydantic import ValidationError

from app.core.config import _INSECURE_DEFAULT_SECRET, Settings


def test_production_refuses_default_secret():
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY must be set explicitly"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY=_INSECURE_DEFAULT_SECRET,
            COOKIE_SECURE=True,
            DATABASE_URL="postgresql+asyncpg://x/y",
        )


def test_production_refuses_short_secret():
    with pytest.raises(ValidationError, match="at least 32 bytes"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="short",
            COOKIE_SECURE=True,
            DATABASE_URL="postgresql+asyncpg://x/y",
        )


def test_production_refuses_insecure_cookies():
    with pytest.raises(ValidationError, match="COOKIE_SECURE must be true"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a" * 32,
            COOKIE_SECURE=False,
            DATABASE_URL="postgresql+asyncpg://x/y",
        )


def test_production_accepts_valid_config():
    settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET_KEY="a" * 32,
        COOKIE_SECURE=True,
        DATABASE_URL="postgresql+asyncpg://x/y",
    )
    assert settings.is_production


def test_development_allows_defaults():
    settings = Settings(ENVIRONMENT="development")
    assert not settings.is_production
