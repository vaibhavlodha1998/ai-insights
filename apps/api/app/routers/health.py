from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import get_redis
from app.db.session import get_session
from app.schemas.health import HealthResponse, ReadinessResponse
from app.services import health as health_service

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def liveness() -> HealthResponse:
    """Process is up. Touches no dependencies."""
    return HealthResponse(status="ok", version=settings.VERSION)


@router.get(
    "/ready",
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse}},
)
async def readiness(
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> ReadinessResponse:
    """Postgres and Redis are reachable. 503 if either is not."""
    results = await health_service.check_readiness(
        session, redis, settings.HEALTH_CHECK_TIMEOUT_SECONDS
    )
    ready = all(results.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(
        status="ok" if ready else "unavailable",
        checks={name: "ok" if ok else "unavailable" for name, ok in results.items()},
    )
