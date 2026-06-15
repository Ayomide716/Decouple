import uuid

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models.analysis import AnalysisJob, JobStatus
from app.schemas.analysis import AnalysisJobCreate, AnalysisJobDetail, AnalysisJobResponse
from app.tasks.ingest import task_analyze_repo

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "/",
    response_model=AnalysisJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_analysis_job(
    payload: AnalysisJobCreate,
    db: Session = Depends(get_db),
) -> AnalysisJob:
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

    log.info("analysis_job_created", job_id=str(job.id), repo=repo_name, task_id=task.id)
    return job


@router.get("/{job_id}", response_model=AnalysisJobDetail)
def get_analysis_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AnalysisJob:
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


@router.get("/", response_model=list[AnalysisJobResponse])
def list_analysis_jobs(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> list[AnalysisJob]:
    return (
        db.query(AnalysisJob)
        .order_by(AnalysisJob.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
