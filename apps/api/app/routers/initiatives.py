
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.models import Initiative, InitiativeStatus, Role, User
from app.repositories import audit
from app.schemas.schemas import (
    InitiativeCreate,
    InitiativeOut,
    InitiativeScoreOut,
    InitiativeUpdate,
)
from app.services.scoring import find_possible_duplicate, score_initiative

router = APIRouter(prefix="/initiatives", tags=["initiatives"])


@router.get("", response_model=list[InitiativeOut])
async def list_initiatives(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
    region_id: str | None = None,
    sphere: str | None = None,
    status_filter: InitiativeStatus | None = Query(default=None, alias="status"),
) -> list[Initiative]:
    stmt = select(Initiative)
    if region_id:
        stmt = stmt.where(Initiative.region_id == region_id)
    if sphere:
        stmt = stmt.where(Initiative.sphere == sphere)
    if status_filter:
        stmt = stmt.where(Initiative.status == status_filter)
    stmt = stmt.order_by(Initiative.created_at.desc())
    result = await db.scalars(stmt)
    return list(result)


@router.get("/{initiative_id}", response_model=InitiativeOut)
async def get_initiative(
    initiative_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> Initiative:
    initiative = await db.get(Initiative, initiative_id)
    if initiative is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "initiative not found")
    return initiative


@router.post("", response_model=InitiativeOut, status_code=status.HTTP_201_CREATED)
async def create_initiative(
    payload: InitiativeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Initiative:
    initiative = Initiative(**payload.model_dump(), author_id=user.id)
    db.add(initiative)
    await db.flush()  # populate initiative.id (Python-side default) before it's referenced below
    await audit.record(
        db, actor_id=user.id, action="create", entity_type="initiative", entity_id=initiative.id
    )
    await db.commit()
    await db.refresh(initiative)
    return initiative


@router.patch("/{initiative_id}", response_model=InitiativeOut)
async def update_initiative(
    initiative_id: str,
    payload: InitiativeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.analyst, Role.curator, Role.admin)),
) -> Initiative:
    initiative = await db.get(Initiative, initiative_id)
    if initiative is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "initiative not found")

    # Analysts may only edit their own drafts; curators/admins can edit any.
    if user.role == Role.analyst and initiative.author_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your initiative")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(initiative, field, value)

    await audit.record(
        db,
        actor_id=user.id,
        action="update",
        entity_type="initiative",
        entity_id=initiative.id,
        detail=",".join(changes.keys()),
    )
    await db.commit()
    await db.refresh(initiative)
    return initiative


@router.delete("/{initiative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_initiative(
    initiative_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.curator, Role.admin)),
) -> None:
    initiative = await db.get(Initiative, initiative_id)
    if initiative is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "initiative not found")
    await audit.record(
        db, actor_id=user.id, action="delete", entity_type="initiative", entity_id=initiative.id
    )
    await db.delete(initiative)
    await db.commit()


@router.post("/{initiative_id}/score", response_model=InitiativeScoreOut)
async def score(
    initiative_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(Role.curator, Role.admin)),
) -> InitiativeScoreOut:
    initiative = await db.get(Initiative, initiative_id)
    if initiative is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "initiative not found")

    others = await db.execute(
        select(Initiative.id, Initiative.title).where(Initiative.id != initiative_id)
    )
    other_titles = [(r.id, r.title) for r in others.all()]
    duplicate_id = find_possible_duplicate(initiative.title, other_titles)

    result = await score_initiative(initiative.title, initiative.description, initiative.sphere)
    initiative.kpi_score = result.kpi_score
    initiative.ai_summary = result.ai_summary

    await audit.record(
        db,
        actor_id=user.id,
        action="score",
        entity_type="initiative",
        entity_id=initiative.id,
        detail=f"provider={result.provider}",
    )
    await db.commit()

    return InitiativeScoreOut(
        kpi_score=result.kpi_score, ai_summary=result.ai_summary, possible_duplicate_of=duplicate_id
    )
