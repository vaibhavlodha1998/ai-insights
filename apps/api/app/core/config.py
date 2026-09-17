from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "starter"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "dev"

    # -------------------------------------------------------------------------
    # Datastores — defaults match infra/docker-compose.yml
    # -------------------------------------------------------------------------
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5434/starter"
    REDIS_URL: str = "redis://localhost:6381/0"

    # Readiness checks give up after this long, so a hung dependency fails fast
    HEALTH_CHECK_TIMEOUT_SECONDS: float = 2.0


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
