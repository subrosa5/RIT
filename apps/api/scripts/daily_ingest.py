"""Daily batch job: score any newly-submitted initiatives and send a
digest of what changed. Run by .github/workflows/daily-digest.yml on a
cron; safe to run manually too — it's idempotent (already-scored
initiatives are left alone) and side-effect-free without secrets (no
Telegram token → digest just prints to stdout instead of failing).

Usage: python -m scripts.daily_ingest   (from apps/api, inside the venv)
"""
import asyncio
import urllib.error
import urllib.request
from datetime import UTC, datetime
from urllib.parse import urlencode

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.models import Initiative, Role, User
from app.services.scoring import score_initiative

settings = get_settings()


async def score_unscored_initiatives() -> list[Initiative]:
    scored: list[Initiative] = []
    async with AsyncSessionLocal() as db:
        pending = await db.scalars(select(Initiative).where(Initiative.kpi_score.is_(None)))
        initiatives = list(pending)
        if not initiatives:
            return []

        system_actor = await db.scalar(select(User).where(User.role == Role.admin).limit(1))

        for initiative in initiatives:
            result = await score_initiative(
                initiative.title, initiative.description, initiative.sphere
            )
            initiative.kpi_score = result.kpi_score
            initiative.ai_summary = result.ai_summary
            scored.append(initiative)

            if system_actor is not None:
                from app.repositories import audit

                await audit.record(
                    db,
                    actor_id=system_actor.id,
                    action="score",
                    entity_type="initiative",
                    entity_id=initiative.id,
                    detail=f"provider={result.provider} source=daily_ingest",
                )

        await db.commit()
    return scored


def build_digest_text(scored: list[Initiative]) -> str:
    today = datetime.now(UTC).strftime("%d.%m.%Y")
    if not scored:
        return f"RIT — дайджест {today}\nНовых инициатив на оценку не найдено."

    lines = [f"RIT — дайджест {today}", f"Оценено новых инициатив: {len(scored)}", ""]
    top = sorted(scored, key=lambda i: i.kpi_score or 0, reverse=True)[:10]
    for initiative in top:
        lines.append(
            f"• {initiative.title} — {initiative.kpi_score}/100 ({initiative.region.name})"
        )
    return "\n".join(lines)


def send_to_telegram(text: str) -> None:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        print("[daily_ingest] TELEGRAM_BOT_TOKEN/CHAT_ID not set — printing digest instead:\n")
        print(text)
        return

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    data = urlencode({"chat_id": settings.TELEGRAM_CHAT_ID, "text": text}).encode()
    request = urllib.request.Request(url, data=data, method="POST")  # noqa: S310 — fixed https host
    try:
        with urllib.request.urlopen(request, timeout=10) as response:  # noqa: S310
            if response.status != 200:
                print(f"[daily_ingest] Telegram responded with status {response.status}")
    except urllib.error.URLError as exc:
        # A failed digest send must not fail the whole job — the scoring
        # already committed; only the notification step is best-effort.
        print(f"[daily_ingest] failed to send Telegram digest: {exc}")


async def main() -> None:
    scored = await score_unscored_initiatives()
    digest = build_digest_text(scored)
    send_to_telegram(digest)


if __name__ == "__main__":
    asyncio.run(main())
