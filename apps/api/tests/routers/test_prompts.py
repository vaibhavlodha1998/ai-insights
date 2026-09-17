import json
import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from httpx2 import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import API_DIR
from app.services.insight_provider import DummyInsightProvider, get_insight_provider

pytestmark = pytest.mark.anyio

SEED_FILE = API_DIR / "alembic" / "seed" / "insights_v1.json"
AI_HEALTHCARE = {"prompt": "How is AI changing healthcare?", "targetLanguage": "en"}


class SpyProvider(DummyInsightProvider):
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def find_insight_ids(
        self, session: AsyncSession, prompt: str, language: str
    ) -> list[uuid.UUID]:
        self.calls.append(prompt)
        return await super().find_insight_ids(session, prompt, language)


@pytest.fixture
def provider(app: FastAPI) -> Iterator[SpyProvider]:
    spy = SpyProvider()
    app.dependency_overrides[get_insight_provider] = lambda: spy
    yield spy


async def submit(client: AsyncClient, body: Any) -> tuple[int, dict[str, Any]]:
    response = await client.post("/prompts", json=body)
    return response.status_code, response.json()


# -----------------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("body", "status", "code", "message"),
    [
        ([], 422, "INVALID_BODY", "Request body must be a JSON object"),
        ({"targetLanguage": "en"}, 422, "PROMPT_REQUIRED", "Prompt is required"),
        (
            {"prompt": "", "targetLanguage": "en"},
            422,
            "PROMPT_REQUIRED",
            "Prompt is required",
        ),
        (
            {"prompt": "   ", "targetLanguage": "en"},
            422,
            "PROMPT_REQUIRED",
            "Prompt is required",
        ),
        (
            {"prompt": 42, "targetLanguage": "en"},
            422,
            "PROMPT_REQUIRED",
            "Prompt is required",
        ),
        (
            {"prompt": "x" * 2001, "targetLanguage": "en"},
            422,
            "PROMPT_TOO_LONG",
            "Prompt must be at most 2000 characters",
        ),
        (
            {"prompt": "AI in healthcare"},
            422,
            "LANGUAGE_REQUIRED",
            "Target language is required",
        ),
        (
            {"prompt": "AI in healthcare", "targetLanguage": "jp"},
            422,
            "INVALID_LANGUAGE",
            "Target language is not supported",
        ),
        (
            {"prompt": "AI in healthcare", "targetLanguage": "EN"},
            422,
            "INVALID_LANGUAGE",
            "Target language is not supported",
        ),
        (
            {"prompt": "AI in healthcare", "targetLanguage": "en", "contextId": "abc"},
            422,
            "INVALID_CONTEXT_ID",
            "Context id must be a valid UUID",
        ),
        (
            {"prompt": "AI in healthcare", "targetLanguage": "en", "model": "gpt"},
            422,
            "VALIDATION_ERROR",
            "Request validation failed",
        ),
    ],
)
async def test_invalid_requests_get_structured_errors(
    db_client: AsyncClient,
    provider: SpyProvider,
    body: Any,
    status: int,
    code: str,
    message: str,
) -> None:
    status_code, payload = await submit(db_client, body)

    assert status_code == status
    assert payload["error"]["code"] == code
    assert payload["error"]["message"] == message
    assert "input" not in payload["error"]["details"][0]
    assert provider.calls == []


async def test_malformed_json_is_a_400(db_client: AsyncClient) -> None:
    response = await db_client.post(
        "/prompts", content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_JSON"


async def test_unknown_context_is_a_404(db_client: AsyncClient) -> None:
    status_code, payload = await submit(
        db_client, {**AI_HEALTHCARE, "contextId": str(uuid.uuid4())}
    )

    assert status_code == 404
    assert payload["error"]["code"] == "CONTEXT_NOT_FOUND"


# -----------------------------------------------------------------------------
# Clarification
# -----------------------------------------------------------------------------


async def test_vague_prompt_asks_for_clarification_without_calling_the_ai(
    db_client: AsyncClient, provider: SpyProvider
) -> None:
    status_code, payload = await submit(
        db_client, {"prompt": "AI", "targetLanguage": "en"}
    )

    assert status_code == 200
    assert payload == {
        "status": "NEEDS_CLARIFICATION",
        "message": "Please provide more details",
        "contextId": payload["contextId"],
    }
    uuid.UUID(payload["contextId"])
    assert provider.calls == []


async def test_follow_up_with_context_combines_the_prompts(
    db_client: AsyncClient, provider: SpyProvider
) -> None:
    _, first = await submit(db_client, {"prompt": "AI", "targetLanguage": "en"})

    status_code, second = await submit(
        db_client,
        {
            "prompt": "in healthcare",
            "targetLanguage": "en",
            "contextId": first["contextId"],
        },
    )

    assert status_code == 200
    assert second["status"] == "SUCCESS"
    assert second["contextId"] == first["contextId"]
    assert provider.calls == ["AI in healthcare"]


async def test_context_starts_fresh_after_a_success(
    db_client: AsyncClient, provider: SpyProvider
) -> None:
    _, success = await submit(db_client, AI_HEALTHCARE)

    _, follow_up = await submit(
        db_client,
        {"prompt": "more", "targetLanguage": "en", "contextId": success["contextId"]},
    )

    assert follow_up["status"] == "NEEDS_CLARIFICATION"
    assert provider.calls == ["How is AI changing healthcare?"]


# -----------------------------------------------------------------------------
# Results and pagination
# -----------------------------------------------------------------------------


async def test_success_returns_first_page_with_metadata(db_client: AsyncClient) -> None:
    status_code, payload = await submit(db_client, AI_HEALTHCARE)

    assert status_code == 200
    assert payload["status"] == "SUCCESS"
    assert payload["pagination"] == {
        "page": 1,
        "pageSize": 10,
        "totalItems": 20,
        "totalPages": 2,
        "hasNextPage": True,
    }
    assert len(payload["insights"]) == 10
    assert set(payload["insights"][0]) == {
        "id",
        "title",
        "content",
        "category",
        "source",
        "confidence",
        "tags",
    }


async def test_next_page_continues_the_same_result(db_client: AsyncClient) -> None:
    _, first = await submit(db_client, AI_HEALTHCARE)

    response = await db_client.get(
        f"/prompts/{first['responseId']}/insights", params={"page": 2}
    )

    second = response.json()
    assert response.status_code == 200
    assert second["pagination"]["page"] == 2
    assert second["pagination"]["hasNextPage"] is False
    assert len(second["insights"]) == 10
    first_ids = {insight["id"] for insight in first["insights"]}
    assert first_ids.isdisjoint(insight["id"] for insight in second["insights"])


async def test_closest_matches_rank_first(db_client: AsyncClient) -> None:
    _, payload = await submit(db_client, AI_HEALTHCARE)

    assert payload["insights"][0]["title"] == (
        "AI-assisted diagnostics are moving into clinics"
    )


async def test_small_results_fit_on_one_page(db_client: AsyncClient) -> None:
    _, payload = await submit(
        db_client, {"prompt": "better sleep routine", "targetLanguage": "en"}
    )

    assert payload["status"] == "SUCCESS"
    assert payload["pagination"]["totalPages"] == 1
    assert payload["pagination"]["hasNextPage"] is False
    assert 0 < len(payload["insights"]) <= 10


async def test_no_matches_is_an_empty_success(db_client: AsyncClient) -> None:
    _, payload = await submit(
        db_client, {"prompt": "penguin migration patterns", "targetLanguage": "en"}
    )

    assert payload["status"] == "SUCCESS"
    assert payload["insights"] == []
    assert payload["pagination"]["totalItems"] == 0


async def test_results_use_the_target_language(db_client: AsyncClient) -> None:
    seed = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    spanish_titles = {item["translations"]["es"]["title"] for item in seed["insights"]}

    _, payload = await submit(
        db_client,
        {"prompt": "¿Cómo está cambiando la IA la salud?", "targetLanguage": "es"},
    )

    titles = [insight["title"] for insight in payload["insights"]]
    assert payload["pagination"]["totalItems"] == 20
    assert set(titles) <= spanish_titles
    # Sharing "IA" with the prompt ranks it onto the first page
    assert "Los diagnósticos asistidos por IA llegan a las clínicas" in titles


@pytest.mark.parametrize("page", ["0", "-1", "abc", "3", "1.5"])
async def test_invalid_pages_are_rejected(db_client: AsyncClient, page: str) -> None:
    _, first = await submit(db_client, AI_HEALTHCARE)

    response = await db_client.get(
        f"/prompts/{first['responseId']}/insights", params={"page": page}
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_PAGE"


async def test_unknown_response_is_a_404(db_client: AsyncClient) -> None:
    response = await db_client.get(f"/prompts/{uuid.uuid4()}/insights")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESPONSE_NOT_FOUND"
