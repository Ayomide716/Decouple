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


class BoundedContextPreview(BaseModel):
    id: str | None
    name: str | None
    description: str | None
    migration_phase: int | None
    coupling_score: str | None


class BlueprintPreview(BaseModel):
    executive_summary: str | None
    bounded_contexts_count: int
    migration_phases_count: int
    shared_data_risks_count: int
    bounded_contexts: list[BoundedContextPreview]


class BlueprintStatusResponse(BaseModel):
    """Lightweight response for the frontend polling loop."""
    id: str
    repo_name: str
    status: JobStatus
    progress: int                         # 0-100
    total_files: int
    total_tokens: int
    error_message: str | None
    blueprint_preview: BlueprintPreview | None
    updated_at: datetime


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "0.1.0"
