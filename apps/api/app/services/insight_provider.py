"""The "AI" behind the API. Only a dummy implementation exists: no LLM is called."""

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Insight
from app.services.clarification import meaningful_words
from app.services.text import tokenize

# Keywords at least this long also match longer words ("health" -> "healthcare")
_PREFIX_MATCH_MIN_LENGTH = 4


class InsightProvider(Protocol):
    async def find_insight_ids(
        self, session: AsyncSession, prompt: str, language: str
    ) -> list[uuid.UUID]:
        """Ids of the insights answering `prompt`, best match first."""
        ...


def keyword_score(words: set[str], keywords: list[str]) -> int:
    score = 0
    for keyword in keywords:
        if keyword in words or (
            len(keyword) >= _PREFIX_MATCH_MIN_LENGTH
            and any(word.startswith(keyword) for word in words)
        ):
            score += 1
    return score


def text_score(words: set[str], insight: Insight) -> int:
    """Prompt words that appear in the insight's own title or content."""
    text_words = set(tokenize(f"{insight.title} {insight.content}"))
    return keyword_score(text_words, list(words))


class DummyInsightProvider:
    """Finds seeded insights for a language by keyword overlap with the prompt.

    Keywords decide *whether* an insight matches; words shared with its title and
    content then move the closest matches up, in any language.
    """

    async def find_insight_ids(
        self, session: AsyncSession, prompt: str, language: str
    ) -> list[uuid.UUID]:
        words = set(meaningful_words(prompt))
        insights = await session.scalars(
            select(Insight).where(Insight.language == language)
        )
        scored = [
            (relevance + text_score(words, insight), insight.title, insight.id)
            for insight in insights
            if (relevance := keyword_score(words, insight.keywords)) > 0
        ]
        scored.sort(key=lambda item: (-item[0], item[1]))
        return [insight_id for _, _, insight_id in scored]


def get_insight_provider() -> InsightProvider:
    return DummyInsightProvider()
