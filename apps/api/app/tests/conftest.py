import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-do-not-use-in-prod-0123456789")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("AUTH_RATE_LIMIT", "1000/minute")  # rate limiting is tested separately below

from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app

# One shared in-memory sqlite engine per test session, via StaticPool so every
# connection sees the same in-memory database instead of a fresh empty one.
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False, class_=AsyncSession)


async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def _fresh_schema() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_client() -> AsyncGenerator[AsyncClient, None]:
    """A logged-in client for a user seeded directly as admin.

    There is deliberately no API endpoint that lets a user grant themselves
    a role — this fixture reaches into the DB the way a real admin
    provisioning script would, not through a shortcut the app itself offers.
    """
    from app.core.security import hash_password
    from app.models.models import Role, User

    async with TestSessionLocal() as session:
        session.add(
            User(
                email="admin@example.com",
                full_name="Admin Test",
                password_hash=hash_password("correcthorse1"),
                role=Role.admin,
            )
        )
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/auth/login", json={"email": "admin@example.com", "password": "correcthorse1"}
        )
        assert resp.status_code == 200
        yield ac
