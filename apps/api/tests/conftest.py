import os
from collections.abc import AsyncIterator, Iterator
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fakeredis import FakeAsyncRedis
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx2 import ASGITransport, AsyncClient
from sqlalchemy import URL, create_engine, pool, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import API_DIR, settings
from app.core.loop import selector_loop_factory
from app.core.redis import get_redis
from app.db.session import get_session
from app.main import create_app

# Always a separate database, so tests can never touch development data
TEST_DATABASE_URL = settings.DATABASE_URL.set(database=f"{settings.POSTGRES_DB}_test")


@pytest.fixture(scope="session")
def anyio_backend() -> tuple[str, dict[str, Any]]:
    # psycopg's async mode needs a selector loop (Windows defaults to Proactor)
    return "asyncio", {"loop_factory": selector_loop_factory}


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client


# -----------------------------------------------------------------------------
# Real-database fixtures. Tests that use them are skipped when Postgres is not
# reachable, unless TEST_DATABASE_REQUIRED=1 (set in CI) makes that a failure.
# -----------------------------------------------------------------------------


def recreate_database(url: URL) -> None:
    admin = create_engine(
        url.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
        poolclass=pool.NullPool,
        # Fail fast when Postgres is down instead of hanging the whole run
        connect_args={"connect_timeout": 3},
    )
    with admin.connect() as connection:
        connection.execute(
            text(f'DROP DATABASE IF EXISTS "{url.database}" WITH (FORCE)')
        )
        connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()


def migrate_database(url: URL) -> None:
    config = Config()
    config.set_main_option("script_location", str(API_DIR / "alembic"))
    engine = create_engine(url, poolclass=pool.NullPool)
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    engine.dispose()


@pytest.fixture(scope="session")
def test_database() -> URL:
    """A freshly created test database with every migration applied."""
    try:
        recreate_database(TEST_DATABASE_URL)
    except OperationalError as exc:
        if os.environ.get("TEST_DATABASE_REQUIRED") == "1":
            raise
        pytest.skip(f"Postgres is not reachable (run `yarn infra:up`): {exc.orig}")
    migrate_database(TEST_DATABASE_URL)
    return TEST_DATABASE_URL


@pytest.fixture
async def db_session(test_database: URL) -> AsyncIterator[AsyncSession]:
    """Session inside a transaction that is rolled back after the test.

    Code under test may call `session.commit()`; with `create_savepoint` those
    commits only release savepoints, so nothing outlives the test.
    """
    engine = create_async_engine(test_database, poolclass=pool.NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def db_client(
    app: FastAPI, db_session: AsyncSession
) -> AsyncIterator[AsyncClient]:
    """Async HTTP client whose requests use `db_session` and an in-memory Redis.

    Use this instead of `client` for tests that hit the database: TestClient runs
    the app on its own event loop, which cannot share `db_session`'s connection.
    """

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield db_session

    redis = FakeAsyncRedis()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_redis] = lambda: redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await redis.aclose()
