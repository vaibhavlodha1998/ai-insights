import asyncio
import logging

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def check_database(session: AsyncSession, timeout: float) -> bool:
    try:
        async with asyncio.timeout(timeout):
            await session.execute(text("SELECT 1"))
    except Exception:
        logger.warning("Database readiness check failed", exc_info=True)
        return False
    return True


async def check_redis(client: Redis, timeout: float) -> bool:
    try:
        async with asyncio.timeout(timeout):
            await client.ping()
    except Exception:
        logger.warning("Redis readiness check failed", exc_info=True)
        return False
    return True


async def check_readiness(
    session: AsyncSession, client: Redis, timeout: float
) -> dict[str, bool]:
    database, redis = await asyncio.gather(
        check_database(session, timeout),
        check_redis(client, timeout),
    )
    return {"database": database, "redis": redis}
