from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy import URL

API_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = API_DIR.parent.parent


class Settings(BaseSettings):
    # The shared repo-root .env comes first; an apps/api/.env overrides it
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", API_DIR / ".env"), extra="ignore"
    )

    PROJECT_NAME: str = "starter"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "dev"

    # Browser origins allowed to call the API, comma-separated in the env file
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # -------------------------------------------------------------------------
    # Datastores — defaults match .env.example and infra/docker-compose.yml
    # -------------------------------------------------------------------------
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5434
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "starter"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6381
    REDIS_DB: int = 0

    # Readiness checks give up after this long, so a hung dependency fails fast
    HEALTH_CHECK_TIMEOUT_SECONDS: float = 2.0

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def DATABASE_URL(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
