from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import get_current_user
from app.core.limiter import limiter
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.models import Role, User
from app.schemas.schemas import TokenPair, UserLogin, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        path="/",
    )


def _set_auth_cookies(response: Response, user_id: str, role: str) -> None:
    access = create_access_token(user_id, role)
    refresh = create_refresh_token(user_id, role)
    _set_cookie(response, "access_token", access, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    _set_cookie(response, "refresh_token", refresh, settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.AUTH_RATE_LIMIT)
async def register(
    request: Request,
    payload: UserRegister,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        # Same message as "wrong password" would be even better against
        # user-enumeration, but a distinct 409 here is an accepted tradeoff
        # for a portfolio project — flagged deliberately, not accidentally.
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=Role.analyst,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    _set_auth_cookies(response, user.id, user.role.value)
    return user


@router.post("/login", response_model=UserOut)
@limiter.limit(settings.AUTH_RATE_LIMIT)
async def login(
    request: Request,
    payload: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid email or password")

    _set_auth_cookies(response, user.id, user.role.value)
    return user


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenPair:
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing refresh token")
    try:
        payload = decode_token(token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc

    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")

    access = create_access_token(user.id, user.role.value)
    _set_cookie(response, "access_token", access, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return TokenPair(access_token=access)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
