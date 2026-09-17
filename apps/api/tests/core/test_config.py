from typing import Any

import pytest

from app.core.config import Settings


def make_settings(**values: Any) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def test_cors_origins_split_from_comma_separated_string() -> None:
    settings = make_settings(CORS_ORIGINS="http://localhost:3000, https://example.com,")

    assert settings.CORS_ORIGINS == ["http://localhost:3000", "https://example.com"]


def test_cors_origins_read_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test,http://b.test")

    assert make_settings().CORS_ORIGINS == ["http://a.test", "http://b.test"]


def test_database_url_escapes_credentials() -> None:
    settings = make_settings(
        POSTGRES_USER="app",
        POSTGRES_PASSWORD="p@ss:word",
        POSTGRES_HOST="db",
        POSTGRES_PORT=5432,
        POSTGRES_DB="starter",
    )

    assert (
        settings.DATABASE_URL.render_as_string(hide_password=False)
        == "postgresql+psycopg://app:p%40ss%3Aword@db:5432/starter"
    )


def test_redis_url() -> None:
    settings = make_settings(REDIS_HOST="cache", REDIS_PORT=6379, REDIS_DB=2)

    assert settings.REDIS_URL == "redis://cache:6379/2"
