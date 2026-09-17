from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.core.redis import redis_client
from app.db.session import engine
from app.routers import health


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await redis_client.aclose()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan
    )

    app.include_router(health.router)

    return app


app = create_app()
