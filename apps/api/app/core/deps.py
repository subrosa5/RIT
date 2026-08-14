from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenError, decode_token
from app.db.session import get_db
from app.models.models import Role, User


async def get_current_user(
    access_token: str = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Reads the access token from an httpOnly cookie — never from a header
    the JS layer could read, and never from localStorage."""
    if not access_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not authenticated")
    try:
        payload = decode_token(access_token, expected_type="access")
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")
    return user


def require_role(*allowed: Role) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Server-side role gate. The frontend hides buttons for UX; this is the
    actual access-control boundary — it is never trusted to be enforced
    client-side alone."""

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "insufficient role")
        return user

    return _checker
