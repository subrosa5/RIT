"""AI scoring service — isolated behind one interface so the LLM provider
is a swappable detail, not something wired into every router.

Without ANTHROPIC_API_KEY set, `score_initiative` falls back to a
deterministic heuristic. This is not a stub that silently does nothing —
it is documented, logged, and produces a genuinely usable (if less
nuanced) score, so the app runs out of the box with zero external
secrets configured.
"""
import re
from dataclasses import dataclass

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

settings = get_settings()

_SCORING_PROMPT = """You are an analyst scoring a submitted regional initiative
for a strategic-initiatives review board. Score novelty, feasibility, and
impact from 0-100 combined, and write a one-paragraph summary for a busy
reviewer. Respond ONLY as JSON: {{"kpi_score": int, "ai_summary": str}}.

Title: {title}
Sphere: {sphere}
Description: {description}
"""


@dataclass
class ScoreResult:
    kpi_score: int
    ai_summary: str
    provider: str


def _heuristic_score(title: str, description: str, sphere: str) -> ScoreResult:
    """Deterministic fallback: length/specificity as a weak proxy for
    effort and detail, clamped to a plausible range. Clearly worse than an
    LLM judgment — that trade-off is the point of documenting it here."""
    words = re.findall(r"\w+", description)
    length_score = min(len(words), 200) / 200 * 60
    specificity_bonus = 15 if any(ch.isdigit() for ch in description) else 0
    sphere_bonus = 10 if sphere.strip() else 0
    score = int(min(100, 15 + length_score + specificity_bonus + sphere_bonus))
    summary = (
        f'"{title}" ({sphere}): эвристическая оценка без LLM — '
        f"{len(words)} слов в описании, скор {score}/100. "
        "Задайте ANTHROPIC_API_KEY, чтобы получать содержательное summary от модели."
    )
    return ScoreResult(kpi_score=score, ai_summary=summary, provider="heuristic")


async def score_initiative(title: str, description: str, sphere: str) -> ScoreResult:
    if not settings.ANTHROPIC_API_KEY:
        logger.info("scoring.fallback", reason="no_api_key")
        return _heuristic_score(title, description, sphere)

    try:
        import anthropic  # imported lazily: optional dependency

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = _SCORING_PROMPT.format(title=title, sphere=sphere, description=description)
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        import json

        block = response.content[0]
        if not isinstance(block, anthropic.types.TextBlock):
            raise ValueError(f"unexpected content block type: {type(block)}")
        payload = json.loads(block.text)
        return ScoreResult(
            kpi_score=int(payload["kpi_score"]),
            ai_summary=str(payload["ai_summary"]),
            provider=settings.AI_MODEL,
        )
    except Exception as exc:  # noqa: BLE001 — a scoring failure must degrade, not 500 the request
        logger.warning("scoring.llm_failed", error=str(exc))
        return _heuristic_score(title, description, sphere)


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
