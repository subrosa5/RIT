from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.models import Region, Role, User
from app.schemas.schemas import RegionCreate, RegionOut

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("", response_model=list[RegionOut])
async def list_regions(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> list[Region]:
    result = await db.scalars(select(Region).order_by(Region.name))
    return list(result)


@router.post("", response_model=RegionOut, status_code=status.HTTP_201_CREATED)
async def create_region(
    payload: RegionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.admin, Role.curator)),
) -> Region:
    region = Region(**payload.model_dump())
    db.add(region)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "region already exists") from exc
    await db.refresh(region)
    return region
