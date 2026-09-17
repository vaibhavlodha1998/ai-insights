import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services import health as health_service


def stub_readiness(monkeypatch: pytest.MonkeyPatch, **results: bool) -> None:
    async def fake_check_readiness(*_: object) -> dict[str, bool]:
        return results

    monkeypatch.setattr(health_service, "check_readiness", fake_check_readiness)


def test_liveness(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": settings.VERSION}


def test_readiness_when_all_dependencies_up(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    stub_readiness(monkeypatch, database=True, redis=True)

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"database": "ok", "redis": "ok"},
    }


def test_readiness_when_a_dependency_is_down(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    stub_readiness(monkeypatch, database=False, redis=True)

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "checks": {"database": "unavailable", "redis": "ok"},
    }
