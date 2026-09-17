import math
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid6 import uuid7

from app.core.errors import AppError, NotFoundError
from app.models import Conversation, Insight, PromptResponse
from app.schemas.prompt import (
    PAGE_SIZE,
    InsightOut,
    InsightsPage,
    NeedsClarificationResponse,
    Pagination,
    PromptRequest,
    SuccessResponse,
)
from app.services.clarification import needs_clarification
from app.services.insight_provider import InsightProvider

NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
SUCCESS = "SUCCESS"


class ContextNotFoundError(NotFoundError):
    code = "CONTEXT_NOT_FOUND"


class ResponseNotFoundError(NotFoundError):
    code = "RESPONSE_NOT_FOUND"


class InvalidPageError(AppError):
    status_code = 422
    code = "INVALID_PAGE"


async def submit_prompt(
    session: AsyncSession, provider: InsightProvider, request: PromptRequest
) -> NeedsClarificationResponse | SuccessResponse:
    conversation = await get_or_create_conversation(session, request.context_id)
    prompts = [*await pending_prompts(session, conversation.id), request.prompt]

    # Decided before the provider is involved: vague prompts never reach the "AI"
    if needs_clarification(prompts):
        session.add(
            PromptResponse(
                conversation_id=conversation.id,
                prompt=request.prompt,
                target_language=request.target_language,
                status=NEEDS_CLARIFICATION,
                insight_ids=[],
            )
        )
        await session.commit()
        return NeedsClarificationResponse(context_id=conversation.id)

    insight_ids = await provider.find_insight_ids(
        session, " ".join(prompts), request.target_language
    )
    response = PromptResponse(
        id=uuid7(),
        conversation_id=conversation.id,
        prompt=request.prompt,
        target_language=request.target_language,
        status=SUCCESS,
        insight_ids=insight_ids,
    )
    session.add(response)
    await session.commit()

    page = await build_page(session, response, page=1)
    return SuccessResponse(context_id=conversation.id, **dict(page))


async def get_insights_page(
    session: AsyncSession, response_id: uuid.UUID, raw_page: str
) -> InsightsPage:
    page = parse_page(raw_page)
    response = await session.get(PromptResponse, response_id)
    if response is None or response.status != SUCCESS:
        raise ResponseNotFoundError("Response not found")
    return await build_page(session, response, page)


async def get_or_create_conversation(
    session: AsyncSession, context_id: uuid.UUID | None
) -> Conversation:
    if context_id is None:
        conversation = Conversation(id=uuid7())
        session.add(conversation)
        await session.flush()
        return conversation

    existing = await session.get(Conversation, context_id)
    if existing is None:
        raise ContextNotFoundError("Context not found")
    return existing


async def pending_prompts(
    session: AsyncSession, conversation_id: uuid.UUID
) -> list[str]:
    """Prompts still waiting for an answer: everything after the last success."""
    turns = await session.execute(
        select(PromptResponse.prompt, PromptResponse.status)
        .where(PromptResponse.conversation_id == conversation_id)
        .order_by(PromptResponse.created_at.desc(), PromptResponse.id.desc())
    )
    pending: list[str] = []
    for prompt, status in turns:
        if status == SUCCESS:
            break
        pending.append(prompt)
    return pending[::-1]


def parse_page(raw_page: str) -> int:
    # isascii() rules out Unicode digits (e.g. superscripts) that int() rejects
    if not (raw_page.isascii() and raw_page.isdigit()) or int(raw_page) < 1:
        raise InvalidPageError("Page must be a positive integer")
    return int(raw_page)


async def build_page(
    session: AsyncSession, response: PromptResponse, page: int
) -> InsightsPage:
    total_items = len(response.insight_ids)
    total_pages = max(1, math.ceil(total_items / PAGE_SIZE))
    if page > total_pages:
        raise InvalidPageError(
            f"Page {page} is out of range",
            details={"totalPages": total_pages},
        )

    start = (page - 1) * PAGE_SIZE
    page_ids = response.insight_ids[start : start + PAGE_SIZE]
    rows = await session.scalars(select(Insight).where(Insight.id.in_(page_ids)))
    by_id = {insight.id: insight for insight in rows}

    return InsightsPage(
        response_id=response.id,
        # Keep the ranking stored with the response, not the database's order
        insights=[
            InsightOut.model_validate(by_id[insight_id])
            for insight_id in page_ids
            if insight_id in by_id
        ],
        pagination=Pagination(
            page=page,
            page_size=PAGE_SIZE,
            total_items=total_items,
            total_pages=total_pages,
            has_next_page=page < total_pages,
        ),
    )
