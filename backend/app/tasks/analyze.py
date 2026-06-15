"""
Celery task: generate migration blueprint from persisted AST summary.

This task is always dispatched by task_analyze_repo (ingest.py) after
the AST parsing stage completes successfully.  It runs on the 'analysis'
queue, which can be scaled independently from the 'ingestion' queue.
"""

import uuid
from typing import Any

import structlog
from anthropic import APIConnectionError, APIStatusError, APITimeoutError
from celery import Task

from app.db.base import SessionLocal
from app.db.models.analysis import AnalysisJob, JobStatus
from app.services.ai_service import AnalysisPassError, ClaudeArchitect
from app.services.analyzer import ASTAnalyzer, RepositoryAST, FileSummary
from app.worker import celery_app

log = structlog.get_logger(__name__)


def _update_job(job_id: str, status: JobStatus, **kwargs: Any) -> None:
    with SessionLocal() as db:
        job = db.get(AnalysisJob, uuid.UUID(job_id))
        if job is None:
            log.error("job_not_found", job_id=job_id)
            return
        job.status = status
        for key, value in kwargs.items():
            setattr(job, key, value)
        db.commit()


def _reconstruct_ast(job: AnalysisJob) -> tuple[RepositoryAST, ASTAnalyzer]:
    """
    Rebuild an ASTAnalyzer + RepositoryAST from the persisted ast_summary JSONB.
    We do not re-clone the repo — the AST data is the source of truth at this stage.
    """
    from pathlib import Path

    summary = job.ast_summary or {}
    files_raw: list[dict[str, Any]] = summary.get("files", [])

    file_summaries: list[FileSummary] = []
    for f in files_raw:
        # Reconstruct minimal FileSummary from the persisted dict
        from app.services.analyzer import ClassSummary, FunctionSummary

        classes = []
        for c in f.get("classes", []):
            methods = [
                FunctionSummary(
                    name=m["name"], line=m["line"], is_async=m.get("is_async", False),
                    args=m.get("args", []), decorators=m.get("decorators", []),
                    docstring=m.get("docstring"), calls=m.get("calls", []),
                )
                for m in c.get("methods", [])
            ]
            classes.append(
                ClassSummary(
                    name=c["name"], line=c.get("line", 0),
                    bases=c.get("bases", []), docstring=c.get("docstring"),
                    methods=methods,
                )
            )

        functions = [
            FunctionSummary(
                name=fn["name"], line=fn.get("line", 0),
                is_async=fn.get("is_async", False), args=fn.get("args", []),
                decorators=fn.get("decorators", []), docstring=fn.get("docstring"),
                calls=fn.get("calls", []),
            )
            for fn in f.get("functions", [])
        ]

        file_summaries.append(
            FileSummary(
                path=f["path"],
                layer=f.get("layer", "other"),
                token_count=f.get("token_count", 0),
                imports=f.get("imports", []),
                internal_imports=f.get("internal_imports", []),
                external_imports=f.get("external_imports", []),
                classes=classes,
                functions=functions,
                has_sqlalchemy_models=f.get("has_sqlalchemy_models", False),
                has_fastapi_routes=f.get("has_fastapi_routes", False),
                has_celery_tasks=f.get("has_celery_tasks", False),
                parse_error=f.get("parse_error"),
            )
        )

    from collections import defaultdict

    layers: dict[str, list[str]] = defaultdict(list)
    dep_graph: dict[str, list[str]] = {}
    inbound_count: dict[str, int] = defaultdict(int)

    for fs in file_summaries:
        layers[fs.layer].append(fs.path)
        dep_graph[fs.path] = fs.internal_imports
        for imp in fs.internal_imports:
            inbound_count[imp] += 1

    hotspots = [
        {"path": p, "inbound_imports": c}
        for p, c in sorted(inbound_count.items(), key=lambda x: -x[1])
        if c >= 3
    ]

    ast_result = RepositoryAST(
        repo_name=job.repo_name,
        total_files=job.total_files,
        total_tokens=job.total_tokens,
        python_files=len(file_summaries),
        layers=dict(layers),
        files=file_summaries,
        dependency_graph=dep_graph,
        coupling_hotspots=hotspots,
    )

    # ASTAnalyzer with a dummy root — only to_dict / to_llm_context are needed
    analyzer = ASTAnalyzer(repo_root=Path("/dev/null"), python_files=[])

    return ast_result, analyzer


@celery_app.task(
    bind=True,
    name="app.tasks.analyze.task_generate_blueprint",
    max_retries=1,
    default_retry_delay=60,
    acks_late=True,
    reject_on_worker_lost=True,
    time_limit=600,        # hard kill after 10 min (LLM calls can be slow)
    soft_time_limit=540,   # SIGTERM at 9 min so we can persist error state
)
def task_generate_blueprint(self: Task, job_id: str) -> dict[str, Any]:
    """
    Stage 5 — Run the 4-pass Claude analysis and persist the blueprint.

    Expects the AnalysisJob row to be in ANALYZING status with
    ast_summary populated by task_analyze_repo.
    """
    logger = log.bind(job_id=job_id)
    logger.info("blueprint_task_start")

    with SessionLocal() as db:
        job = db.get(AnalysisJob, uuid.UUID(job_id))
        if job is None:
            logger.error("job_not_found")
            return {"error": "job not found"}

        if job.status == JobStatus.COMPLETED:
            logger.info("job_already_completed")
            return {"job_id": job_id, "skipped": True}

        if job.ast_summary is None:
            msg = "ast_summary is null — ingest must complete before blueprint generation"
            logger.error("missing_ast_summary")
            _update_job(job_id, JobStatus.FAILED, error_message=msg)
            return {"error": msg}

        repo_name = job.repo_name

    try:
        ast_result, analyzer = _reconstruct_ast(
            # Re-fetch with a fresh session to avoid stale state
            _fetch_job(job_id)
        )

        architect = ClaudeArchitect()
        blueprint = architect.generate_blueprint(ast_result, analyzer)

        _update_job(
            job_id,
            JobStatus.COMPLETED,
            migration_blueprint=blueprint,
        )

        logger.info("blueprint_task_complete", repo=repo_name)
        return {
            "job_id": job_id,
            "contexts": len(blueprint.get("bounded_contexts", [])),
            "phases": len(blueprint.get("migration_phases", [])),
        }

    except (APIConnectionError, APITimeoutError) as exc:
        logger.error("claude_network_error", error=str(exc))
        _update_job(
            job_id,
            JobStatus.FAILED,
            error_message=f"Anthropic API network error: {exc}",
        )
        raise self.retry(exc=exc)

    except APIStatusError as exc:
        logger.error("claude_api_error", status=exc.status_code, error=str(exc))
        _update_job(
            job_id,
            JobStatus.FAILED,
            error_message=f"Anthropic API error ({exc.status_code}): {exc.message}",
        )
        # Do not retry on 4xx (bad request / auth)
        if exc.status_code < 500:
            return {"error": str(exc)}
        raise self.retry(exc=exc)

    except AnalysisPassError as exc:
        logger.error("claude_parse_error", error=str(exc))
        _update_job(job_id, JobStatus.FAILED, error_message=str(exc))
        return {"error": str(exc)}

    except Exception as exc:
        logger.exception("blueprint_task_failed", error=str(exc))
        _update_job(job_id, JobStatus.FAILED, error_message=str(exc))
        raise


def _fetch_job(job_id: str) -> AnalysisJob:
    with SessionLocal() as db:
        job = db.get(AnalysisJob, uuid.UUID(job_id))
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        # Expunge so we can use the object outside the session
        db.expunge(job)
        return job
