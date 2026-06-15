import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.analysis import AnalysisJob, JobStatus
from app.schemas.analysis import (
    AnalysisJobCreate,
    AnalysisJobDetail,
    AnalysisJobResponse,
    BlueprintStatusResponse,
)
from app.tasks.ingest import task_analyze_repo

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


# ── POST /analysis/ ───────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit a repository for analysis",
)
def create_analysis_job(
    payload: AnalysisJobCreate,
    db: Session = Depends(get_db),
) -> AnalysisJob:
    """
    Accept a GitHub URL, create an AnalysisJob row, and dispatch the
    ingestion + analysis pipeline to Celery.  Returns immediately with
    the job id and PENDING status.
    """
    repo_url_str = str(payload.repo_url)
    repo_name = repo_url_str.rstrip("/").split("/")[-1].removesuffix(".git")

    job = AnalysisJob(
        repo_url=repo_url_str,
        repo_name=repo_name,
        status=JobStatus.PENDING,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    task = task_analyze_repo.apply_async(
        args=[str(job.id), repo_url_str],
        kwargs={"github_token": payload.github_token},
        queue="ingestion",
    )

    job.celery_task_id = task.id
    db.commit()
    db.refresh(job)

    log.info(
        "analysis_job_created",
        job_id=str(job.id),
        repo=repo_name,
        task_id=task.id,
    )
    return job


# ── GET /analysis/{job_id} ────────────────────────────────────────────────────

@router.get(
    "/{job_id}",
    response_model=AnalysisJobDetail,
    summary="Get full job detail including blueprint",
)
def get_analysis_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AnalysisJob:
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


# ── GET /analysis/{job_id}/status ────────────────────────────────────────────

@router.get(
    "/{job_id}/status",
    response_model=BlueprintStatusResponse,
    summary="Lightweight status + progress endpoint for polling",
)
def get_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Lightweight endpoint designed for the frontend poller.
    Returns status, progress percentage, and — when completed —
    the top-level blueprint fields without the full AST payload.
    """
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    STATUS_PROGRESS = {
        JobStatus.PENDING: 5,
        JobStatus.CLONING: 20,
        JobStatus.PARSING: 45,
        JobStatus.ANALYZING: 75,
        JobStatus.COMPLETED: 100,
        JobStatus.FAILED: 0,
    }

    blueprint_preview: dict[str, Any] | None = None
    if job.status == JobStatus.COMPLETED and job.migration_blueprint:
        bp = job.migration_blueprint
        blueprint_preview = {
            "executive_summary": bp.get("executive_summary"),
            "bounded_contexts_count": len(bp.get("bounded_contexts", [])),
            "migration_phases_count": len(bp.get("migration_phases", [])),
            "shared_data_risks_count": len(bp.get("shared_data_risks", [])),
            "bounded_contexts": [
                {
                    "id": c.get("id"),
                    "name": c.get("name"),
                    "description": c.get("description"),
                    "migration_phase": c.get("migration_phase"),
                    "coupling_score": c.get("coupling_score"),
                }
                for c in bp.get("bounded_contexts", [])
            ],
        }

    return {
        "id": str(job.id),
        "repo_name": job.repo_name,
        "status": job.status,
        "progress": STATUS_PROGRESS[job.status],
        "total_files": job.total_files,
        "total_tokens": job.total_tokens,
        "error_message": job.error_message,
        "blueprint_preview": blueprint_preview,
        "updated_at": job.updated_at,
    }


# ── GET /analysis/ ────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[AnalysisJobResponse],
    summary="List all analysis jobs",
)
def list_analysis_jobs(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    status_filter: JobStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[AnalysisJob]:
    q = db.query(AnalysisJob).order_by(AnalysisJob.created_at.desc())
    if status_filter is not None:
        q = q.filter(AnalysisJob.status == status_filter)
    return q.offset(offset).limit(limit).all()
