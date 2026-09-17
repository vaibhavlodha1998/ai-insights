from fastapi.testclient import TestClient

from app.core.config import settings


def test_cors_allows_configured_origin(client: TestClient) -> None:
    origin = settings.CORS_ORIGINS[0]

    response = client.get("/health", headers={"Origin": origin})

    assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_unknown_origin(client: TestClient) -> None:
    response = client.get("/health", headers={"Origin": "https://evil.test"})

    assert "access-control-allow-origin" not in response.headers


def test_lifespan_creates_clients_per_app(client: TestClient) -> None:
    state = client.app.state  # type: ignore[attr-defined]

    assert state.redis is not None
    assert state.session_factory is not None
