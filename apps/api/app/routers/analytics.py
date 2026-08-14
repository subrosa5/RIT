from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Initiative, Region, User
from app.schemas.schemas import AnalyticsSummary, RegionBreakdown, SphereBreakdown

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
) -> AnalyticsSummary:
    total = await db.scalar(select(func.count(Initiative.id))) or 0

    status_rows = await db.execute(
        select(Initiative.status, func.count(Initiative.id)).group_by(Initiative.status)
    )
    by_status = {row[0].value: row[1] for row in status_rows.all()}

    sphere_rows = await db.execute(
        select(Initiative.sphere, func.count(Initiative.id))
        .group_by(Initiative.sphere)
        .order_by(func.count(Initiative.id).desc())
    )
    by_sphere = [SphereBreakdown(sphere=r[0], count=r[1]) for r in sphere_rows.all()]

    region_rows = await db.execute(
        select(Region.name, func.count(Initiative.id))
        .join(Initiative, Initiative.region_id == Region.id)
        .group_by(Region.name)
        .order_by(func.count(Initiative.id).desc())
    )
    by_region = [RegionBreakdown(region=r[0], count=r[1]) for r in region_rows.all()]

    return AnalyticsSummary(
        total_initiatives=total, by_status=by_status, by_sphere=by_sphere, by_region=by_region
    )
