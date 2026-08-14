from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AuditLog


async def record(
    db: AsyncSession,
    *,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    detail: str = "",
) -> None:
    """Append-only audit trail. Called from services, never skipped for
    'trivial' mutations — an incomplete trail is worse than a verbose one."""
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
        )
    )
