import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.middleware import SecurityHeadersMiddleware
from app.routers import analytics, auth, health, initiatives, regions

settings = get_settings()
logger = structlog.get_logger(__name__)

app = FastAPI(
    title="RIT API",
    description="Regional Initiatives Tracker — API",
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS, content={"detail": "too many requests"}
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Never leak internals; log full detail server-side, return a stable shape to the client.
    logger.info("validation.failed", path=str(request.url), errors=exc.errors())
    return JSONResponse(status_code=422, content={"detail": "validation error"})


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api")
app.include_router(regions.router, prefix="/api")
app.include_router(initiatives.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
