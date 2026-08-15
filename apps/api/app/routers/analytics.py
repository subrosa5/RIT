from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Initiative, Region
from app.schemas.schemas import AnalyticsSummary, RegionBreakdown, ScoreBucket, SphereBreakdown

router = APIRouter(prefix="/analytics", tags=["analytics"])

_SCORE_BUCKETS = [(0, 20), (21, 40), (41, 60), (61, 80), (81, 100)]


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(db: AsyncSession = Depends(get_db)) -> AnalyticsSummary:
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

    scored_rows = await db.scalars(
        select(Initiative.kpi_score).where(Initiative.kpi_score.is_not(None))
    )
    # The WHERE clause already excludes NULLs, but the column's static type
    # is still `int | None` — narrow it here so mypy (correctly) doesn't
    # have to trust a SQL filter it can't see into.
    scores = [s for s in scored_rows.all() if s is not None]
    scored_count = len(scores)
    avg_kpi_score = round(sum(scores) / scored_count, 1) if scored_count else None

    score_distribution = [
        ScoreBucket(
            bucket=f"{low}-{high}",
            count=sum(1 for s in scores if low <= s <= high),
        )
        for low, high in _SCORE_BUCKETS
    ]

    return AnalyticsSummary(
        total_initiatives=total,
        scored_count=scored_count,
        avg_kpi_score=avg_kpi_score,
        by_status=by_status,
        by_sphere=by_sphere,
        by_region=by_region,
        score_distribution=score_distribution,
    )
