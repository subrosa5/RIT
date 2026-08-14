"""Password hashing and JWT issuance/verification.

Design choices, spelled out:
- argon2id for password hashing (via passlib), not bcrypt/md5/sha256.
- Access tokens are short-lived (15 min) and carry only user id + role.
- Refresh tokens are long-lived (7 days), stored as httpOnly+Secure cookies,
  never in localStorage (XSS-readable storage is not an option for tokens).
- Every token is typed ("type": "access" | "refresh") so an access token
  can never be replayed as a refresh token and vice versa.
"""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return str(pwd_context.hash(plain_password))


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bool(pwd_context.verify(plain_password, password_hash))


def _create_token(subject: str, role: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str, role: str) -> str:
    return _create_token(
        user_id, role, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(user_id: str, role: str) -> str:
    return _create_token(
        user_id, role, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


class TokenError(Exception):
    pass


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("token_invalid") from exc

    if payload.get("type") != expected_type:
        raise TokenError("token_wrong_type")
    return dict(payload)
