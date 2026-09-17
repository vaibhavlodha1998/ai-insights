from fastapi import Request
from redis.asyncio import Redis

from app.core.config import Settings


def create_redis(settings: Settings) -> Redis:
    return Redis.from_url(settings.REDIS_URL)


def get_redis(request: Request) -> Redis:
    redis: Redis = request.app.state.redis
    return redis
