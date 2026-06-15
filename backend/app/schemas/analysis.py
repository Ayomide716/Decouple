import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, HttpUrl

from app.db.models.analysis import JobStatus


class AnalysisJobCreate(BaseModel):
    repo_url: HttpUrl
    github_token: str | None = None


class AnalysisJobResponse(BaseModel):
    id: uuid.UUID
    repo_url: str | None
    repo_name: str
    status: JobStatus
    error_message: str | None
    total_files: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnalysisJobDetail(AnalysisJobResponse):
    file_tree: dict[str, Any] | None
    ast_summary: dict[str, Any] | None
    migration_blueprint: dict[str, Any] | None


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "0.1.0"
