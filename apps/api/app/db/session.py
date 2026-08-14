from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

if "sqlite" in settings.DATABASE_URL:
    connect_args: dict[str, object] = {"check_same_thread": False}
else:
    # Neon (and most managed Postgres) require TLS; `sslmode`/`channel_binding`
    # were already stripped from the URL by Settings — asyncpg wants SSL
    # negotiated via connect_args, not a query-string flag.
    connect_args = {"ssl": "require"}

engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: one session per request, always closed."""
    async with AsyncSessionLocal() as session:
        yield session
