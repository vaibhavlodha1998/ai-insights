from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware
from app.core.redis import create_redis
from app.db.session import create_engine, create_session_factory
from app.routers import health
from app.schemas.error import ErrorResponse


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine(settings)
    app.state.session_factory = create_session_factory(engine)
    app.state.redis = create_redis(settings)
    try:
        yield
    finally:
        await app.state.redis.aclose()
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        lifespan=lifespan,
        responses={500: {"model": ErrorResponse}},
    )

    register_exception_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=[REQUEST_ID_HEADER],
    )
    # Added last so it is outermost: every response, CORS ones included, gets an id
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router)

    return app


# Configured once at import, not in create_app(), so tests can build many apps
configure_logging(settings)
app = create_app()
