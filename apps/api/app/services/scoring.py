"""AI scoring service — isolated behind one interface so the LLM provider
is a swappable detail, not something wired into every router.

Without ANTHROPIC_API_KEY set, `score_initiative` falls back to a
deterministic heuristic. This is not a stub that silently does nothing —
it is documented, logged, and produces a genuinely usable (if less
nuanced) score, so the app runs out of the box with zero external
secrets configured.

Every score also carries a `factors` breakdown — the point of an
AI-assist tool for a review board is that a human can see *why* a
number came out the way it did, not just the number.
"""
import json
import re
from dataclasses import dataclass, field

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

settings = get_settings()

_SCORING_PROMPT = """You are an analyst scoring a submitted regional initiative
for a strategic-initiatives review board. Score novelty, feasibility, and
impact from 0-100 combined, and write a one-paragraph summary for a busy
reviewer. Also break the score into 3-5 named factors that explain how you
got there — each with a short label, a one-line note, and the points it
contributed (they should sum to roughly kpi_score).

Respond ONLY as JSON:
{{"kpi_score": int, "ai_summary": str,
  "factors": [{{"label": str, "detail": str, "points": number}}]}}

Title: {title}
Sphere: {sphere}
Description: {description}
"""


@dataclass
class ScoreFactor:
    label: str
    detail: str
    points: float


@dataclass
class ScoreResult:
    kpi_score: int
    ai_summary: str
    provider: str
    factors: list[ScoreFactor] = field(default_factory=list)


def heuristic_score(title: str, description: str, sphere: str) -> ScoreResult:
    """Deterministic fallback: length/specificity as a weak proxy for
    effort and detail, clamped to a plausible range. Clearly worse than an
    LLM judgment — that trade-off is the point of documenting it here.
    Every component below is also what gets shown to the reviewer, so the
    formula can't drift out of sync with its own explanation."""
    words = re.findall(r"\w+", description)
    base = 15.0
    length_score = round(min(len(words), 200) / 200 * 60, 1)
    has_digits = any(ch.isdigit() for ch in description)
    specificity_bonus = 15.0 if has_digits else 0.0
    sphere_bonus = 10.0 if sphere.strip() else 0.0
    score = int(min(100, base + length_score + specificity_bonus + sphere_bonus))

    factors = [
        ScoreFactor("Базовый балл", "стартовое значение для любой заявки", base),
        ScoreFactor("Длина описания", f"{len(words)} слов (макс. учитывается 200)", length_score),
        ScoreFactor(
            "Конкретика",
            "в тексте есть цифры/показатели" if has_digits else "цифр и показателей не найдено",
            specificity_bonus,
        ),
        ScoreFactor(
            "Указана сфера", sphere if sphere.strip() else "не указана", sphere_bonus
        ),
    ]

    summary = (
        f'"{title}" ({sphere}): эвристическая оценка без LLM — '
        f"{len(words)} слов в описании, скор {score}/100. "
        "Задайте ANTHROPIC_API_KEY, чтобы получать содержательное summary от модели."
    )
    return ScoreResult(kpi_score=score, ai_summary=summary, provider="heuristic", factors=factors)


async def score_initiative(title: str, description: str, sphere: str) -> ScoreResult:
    if not settings.ANTHROPIC_API_KEY:
        logger.info("scoring.fallback", reason="no_api_key")
        return heuristic_score(title, description, sphere)

    try:
        import anthropic  # imported lazily: optional dependency

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = _SCORING_PROMPT.format(title=title, sphere=sphere, description=description)
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )

        block = response.content[0]
        if not isinstance(block, anthropic.types.TextBlock):
            raise ValueError(f"unexpected content block type: {type(block)}")
        payload = json.loads(block.text)
        factors = [
            ScoreFactor(
                label=str(f.get("label", "")),
                detail=str(f.get("detail", "")),
                points=float(f.get("points", 0)),
            )
            for f in payload.get("factors", [])
        ]
        return ScoreResult(
            kpi_score=int(payload["kpi_score"]),
            ai_summary=str(payload["ai_summary"]),
            provider=settings.AI_MODEL,
            factors=factors,
        )
    except Exception as exc:  # noqa: BLE001 — a scoring failure must degrade, not 500 the request
        logger.warning("scoring.llm_failed", error=str(exc))
        return heuristic_score(title, description, sphere)


def find_possible_duplicate(new_title: str, existing_titles: list[tuple[str, str]]) -> str | None:
    """Cheap lexical overlap check used as a stand-in for the pgvector
    cosine-similarity search planned for the Postgres deployment (see
    README, "AI layer") — kept dependency-free so it also runs against
    the SQLite dev/test database."""
    new_words = set(re.findall(r"\w+", new_title.lower()))
    if not new_words:
        return None
    for existing_id, existing_title in existing_titles:
        existing_words = set(re.findall(r"\w+", existing_title.lower()))
        if not existing_words:
            continue
        overlap = len(new_words & existing_words) / len(new_words | existing_words)
        if overlap >= 0.6:
            return existing_id
    return None
