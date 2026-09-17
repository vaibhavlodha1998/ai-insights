import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.error import ErrorResponse
from app.schemas.prompt import (
    InsightsPage,
    NeedsClarificationResponse,
    PromptRequest,
    PromptResult,
    SuccessResponse,
)
from app.services import prompts as prompt_service
from app.services.insight_provider import InsightProvider, get_insight_provider

router = APIRouter(prefix="/prompts", tags=["prompts"])

ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    status: {"model": ErrorResponse} for status in (400, 404, 422)
}


@router.post("", response_model=PromptResult, responses=ERROR_RESPONSES)
async def submit_prompt(
    request: PromptRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[InsightProvider, Depends(get_insight_provider)],
) -> NeedsClarificationResponse | SuccessResponse:
    """Validate a prompt, ask for clarification if it is too vague, else return insights.

    Always 200 for a valid request; `status` tells the two outcomes apart.
    """
    return await prompt_service.submit_prompt(session, provider, request)


@router.get(
    "/{response_id}/insights", response_model=InsightsPage, responses=ERROR_RESPONSES
)
async def get_insights_page(
    response_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    page: Annotated[str, Query(description="1-based page number")] = "1",
) -> InsightsPage:
    """Another page of a successful response, in the same order as the first."""
    return await prompt_service.get_insights_page(session, response_id, page)
