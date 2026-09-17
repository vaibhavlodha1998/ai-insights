import logging
import re

import pytest
from fastapi.testclient import TestClient


def test_generates_request_id(client: TestClient) -> None:
    response = client.get("/health")

    assert re.fullmatch(r"[0-9a-f]{32}", response.headers["x-request-id"])


def test_reuses_valid_incoming_request_id(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-ID": "abc-123.DEF_4"})

    assert response.headers["x-request-id"] == "abc-123.DEF_4"


@pytest.mark.parametrize("incoming", ["has space", "x" * 129, "semi;colon"])
def test_replaces_unsafe_incoming_request_id(client: TestClient, incoming: str) -> None:
    response = client.get("/health", headers={"X-Request-ID": incoming})

    assert response.headers["x-request-id"] != incoming


def test_logs_one_line_per_request(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="app.request")

    response = client.get("/health")

    [record] = [r for r in caplog.records if r.name == "app.request"]
    assert record.getMessage().startswith("GET /health 200 ")
    assert record.__dict__["status_code"] == 200
    assert response.headers["x-request-id"]


def test_request_id_exposed_to_browsers(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})

    assert "x-request-id" in response.headers["access-control-expose-headers"].lower()
