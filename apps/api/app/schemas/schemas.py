"""Pydantic v2 schemas — the same shapes are mirrored in the frontend as Zod
schemas (packages/schemas), so the client/server boundary is validated
independently on both sides instead of trusting one shared runtime.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.models import InitiativeStatus, Role

# ---------- Auth ----------


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("password must mix letters and digits")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: Role
    created_at: datetime


class TokenPair(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Region ----------


class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    federal_district: str | None = None


class RegionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    federal_district: str | None = Field(default=None, max_length=255)


# ---------- Scoring ----------


class ScoreFactorOut(BaseModel):
    label: str
    detail: str
    points: float


# ---------- Initiative ----------


class InitiativeCreate(BaseModel):
    title: str = Field(min_length=4, max_length=300)
    description: str = Field(min_length=20, max_length=8000)
    sphere: str = Field(min_length=2, max_length=120)
    region_id: str


class InitiativeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=4, max_length=300)
    description: str | None = Field(default=None, min_length=20, max_length=8000)
    sphere: str | None = Field(default=None, min_length=2, max_length=120)
    status: InitiativeStatus | None = None


class InitiativeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    sphere: str
    status: InitiativeStatus
    region: RegionOut
    author: UserOut
    kpi_score: int | None = None
    ai_summary: str | None = None
    score_factors: list[ScoreFactorOut] | None = None
    created_at: datetime
    updated_at: datetime


class InitiativeScoreOut(BaseModel):
    kpi_score: int
    ai_summary: str
    factors: list[ScoreFactorOut]
    possible_duplicate_of: str | None = None


# ---------- Audit ----------


class AuditLogOut(BaseModel):
    id: str
    action: str
    actor_name: str
    detail: str | None = None
    created_at: datetime


# ---------- Analytics ----------


class SphereBreakdown(BaseModel):
    sphere: str
    count: int


class RegionBreakdown(BaseModel):
    region: str
    count: int


class ScoreBucket(BaseModel):
    bucket: str
    count: int


class AnalyticsSummary(BaseModel):
    total_initiatives: int
    scored_count: int
    avg_kpi_score: float | None
    by_status: dict[str, int]
    by_sphere: list[SphereBreakdown]
    by_region: list[RegionBreakdown]
    score_distribution: list[ScoreBucket]
