from collections.abc import Iterator

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.errors import (
    ConflictError,
    NotFoundError,
    error_code,
    validation_error,
)


@pytest.fixture
def error_client(app: FastAPI) -> Iterator[TestClient]:
    @app.get("/boom/not-found")
    async def raise_not_found() -> None:
        raise NotFoundError("Widget 42 does not exist")

    @app.get("/boom/conflict")
    async def raise_conflict() -> None:
        raise ConflictError("Name taken", details={"field": "name"})

    @app.get("/boom/http")
    async def raise_http() -> None:
        raise HTTPException(status_code=403, detail="Nope")

    @app.get("/boom/unexpected")
    async def raise_unexpected() -> None:
        raise RuntimeError("secret internals")

    @app.get("/items/{item_id}")
    async def read_item(item_id: int) -> dict[str, int]:
        return {"item_id": item_id}

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


def test_app_error_uses_its_status_and_code(error_client: TestClient) -> None:
    response = error_client.get("/boom/not-found")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "Widget 42 does not exist",
            "request_id": response.headers["x-request-id"],
            "details": None,
        }
    }


def test_app_error_includes_details(error_client: TestClient) -> None:
    response = error_client.get("/boom/conflict")

    assert response.status_code == 409
    assert response.json()["error"]["details"] == {"field": "name"}


def test_http_exception_is_wrapped(error_client: TestClient) -> None:
    response = error_client.get("/boom/http")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
    assert response.json()["error"]["message"] == "Nope"


def test_unknown_route_is_wrapped(error_client: TestClient) -> None:
    response = error_client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_validation_error_lists_problems(error_client: TestClient) -> None:
    response = error_client.get("/items/abc")

    body = response.json()["error"]
    assert response.status_code == 422
    assert body["code"] == "VALIDATION_ERROR"
    assert body["details"][0]["loc"] == ["path", "item_id"]


def test_unexpected_error_hides_internals(error_client: TestClient) -> None:
    response = error_client.get("/boom/unexpected", headers={"X-Request-ID": "trace-1"})

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "Internal server error",
            "request_id": "trace-1",
            "details": None,
        }
    }


def test_error_code_from_status() -> None:
    assert error_code(405) == "METHOD_NOT_ALLOWED"
    assert error_code(599) == "ERROR"


def test_validation_error_prefers_custom_codes() -> None:
    errors = [
        {"type": "PROMPT_REQUIRED", "msg": "Prompt is required", "loc": ("body",)}
    ]

    assert validation_error(errors) == (422, "PROMPT_REQUIRED", "Prompt is required")


def test_validation_error_for_malformed_json() -> None:
    errors = [{"type": "json_invalid", "msg": "JSON decode error", "loc": ("body", 1)}]

    assert validation_error(errors)[:2] == (400, "INVALID_JSON")


def test_validation_error_for_missing_body() -> None:
    errors = [{"type": "missing", "msg": "Field required", "loc": ("body",)}]

    assert validation_error(errors)[:2] == (422, "INVALID_BODY")
