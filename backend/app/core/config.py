from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    secret_key: str = Field(min_length=32)
    allowed_origins: str = "http://localhost:3000"

    # ── PostgreSQL ────────────────────────────────────────────
    postgres_user: str = "decouple"
    postgres_password: str
    postgres_db: str = "decouple_db"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    # ── Redis ─────────────────────────────────────────────────
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str

    # ── Anthropic ─────────────────────────────────────────────
    anthropic_api_key: str

    # ── GitHub ────────────────────────────────────────────────
    github_token: str = ""

    # ── Ingestion ─────────────────────────────────────────────
    repo_scratch_dir: str = "/tmp/decouple_repos"
    max_file_size_bytes: int = 512_000          # 500 KB per file
    max_repo_size_bytes: int = 500_000_000      # 500 MB total clone

    @computed_field  # type: ignore[misc]
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def celery_broker_url(self) -> str:
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"

    @computed_field  # type: ignore[misc]
    @property
    def celery_result_backend(self) -> str:
        return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/1"

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
