import asyncio
from typing import Any

import pytest
from fakeredis import FakeAsyncRedis

from app.services.health import check_database, check_readiness, check_redis

pytestmark = pytest.mark.anyio


class FakeSession:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    async def execute(self, *_: Any) -> None:
        if self.error:
            raise self.error


class HangingRedis:
    async def ping(self) -> bool:
        await asyncio.sleep(10)
        return True


async def test_check_database_ok() -> None:
    assert await check_database(FakeSession(), timeout=1) is True  # type: ignore[arg-type]


async def test_check_database_error() -> None:
    session = FakeSession(ConnectionError("database down"))

    assert await check_database(session, timeout=1) is False  # type: ignore[arg-type]


async def test_check_redis_ok() -> None:
    assert await check_redis(FakeAsyncRedis(), timeout=1) is True


async def test_check_redis_times_out() -> None:
    assert await check_redis(HangingRedis(), timeout=0.01) is False  # type: ignore[arg-type]


async def test_check_readiness_reports_each_dependency() -> None:
    session = FakeSession(ConnectionError("database down"))

    results = await check_readiness(session, FakeAsyncRedis(), timeout=1)  # type: ignore[arg-type]

    assert results == {"database": False, "redis": True}
