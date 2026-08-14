import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    # Python-side, microsecond-resolution timestamp — not server_default's
    # CURRENT_TIMESTAMP, which on SQLite only has second resolution and
    # made two audit-log rows written in the same request indistinguishable
    # by "when", breaking ORDER BY created_at for anything that happens fast
    # (create-then-score in the same test, a bulk import, ...).
    return datetime.now(UTC)


class Role(str, enum.Enum):
    analyst = "analyst"
    curator = "curator"
    admin = "admin"


class InitiativeStatus(str, enum.Enum):
    draft = "draft"
    in_review = "in_review"
    recommended = "recommended"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.analyst, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    federal_district: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Initiative(Base):
    __tablename__ = "initiatives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    sphere: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[InitiativeStatus] = mapped_column(
        Enum(InitiativeStatus), default=InitiativeStatus.draft, nullable=False
    )
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    kpi_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Structured breakdown behind kpi_score — [{"label", "detail", "points"}, ...].
    # A number alone tells a reviewer nothing about *why*; this does.
    score_factors: Mapped[list[dict[str, object]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    region: Mapped["Region"] = relationship(lazy="joined")
    author: Mapped["User"] = relationship(lazy="joined")


class AuditLog(Base):
    """Append-only. Nothing ever updates or deletes a row here."""

    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # create|update|delete
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
