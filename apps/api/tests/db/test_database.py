import pytest
from httpx2 import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.anyio


async def test_connected_to_the_test_database(db_session: AsyncSession) -> None:
    name = await db_session.scalar(text("SELECT current_database()"))

    assert name is not None
    assert name.endswith("_test")


# Runs twice: the second run would fail with "already exists" if the first
# run's committed table had leaked out of its test
@pytest.mark.parametrize("run", [1, 2])
async def test_commits_are_rolled_back_after_each_test(
    db_session: AsyncSession, run: int
) -> None:
    await db_session.execute(text("CREATE TABLE isolation_probe (id int)"))
    await db_session.execute(
        text("INSERT INTO isolation_probe VALUES (:run)"), {"run": run}
    )
    await db_session.commit()

    assert await db_session.scalar(text("SELECT count(*) FROM isolation_probe")) == 1


async def test_readiness_against_real_database(db_client: AsyncClient) -> None:
    response = await db_client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"database": "ok", "redis": "ok"},
    }
