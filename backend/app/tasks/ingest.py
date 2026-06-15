"""
Ingestion pipeline task.

Stages:
  1. Clone / validate the repository
  2. Strip binaries, lock files, and oversized blobs
  3. Walk the filtered tree; extract AST metadata per Python file
  4. Persist results to the AnalysisJob row
  5. Dispatch the LLM analysis task (Phase 2)
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import Any

import structlog
import tiktoken
from celery import Task
from git import GitCommandError, InvalidGitRepositoryError, Repo
from pathspec import PathSpec
from pathspec.patterns import GitWildMatchPattern

from app.db.base import SessionLocal
from app.db.models.analysis import AnalysisJob, JobStatus
from app.services.analyzer import ASTAnalyzer
from app.worker import celery_app

log = structlog.get_logger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

BLOCKLIST_DIRS: frozenset[str] = frozenset(
    {
        "node_modules", ".git", "__pycache__", ".mypy_cache", ".pytest_cache",
        ".ruff_cache", "dist", "build", ".next", ".nuxt", "coverage",
        "htmlcov", ".venv", "venv", "env", ".env", "vendor", "target",
        ".gradle", ".idea", ".vscode",
    }
)

BLOCKLIST_EXTENSIONS: frozenset[str] = frozenset(
    {
        # binaries / media
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
        ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
        ".bz2", ".7z", ".rar", ".exe", ".dll", ".so", ".dylib",
        ".wasm", ".bin", ".dat",
        # locks / generated
        ".lock", ".sum",
        # fonts
        ".ttf", ".woff", ".woff2", ".eot",
        # compiled
        ".pyc", ".pyo", ".class",
        # database dumps
        ".sql", ".db", ".sqlite", ".sqlite3",
    }
)

MAX_FILE_BYTES: int = 512_000   # 500 KB
ENCODING = tiktoken.get_encoding("cl100k_base")


# ── Helpers ───────────────────────────────────────────────────────────────────


def _update_job_status(job_id: str, status: JobStatus, **kwargs: Any) -> None:
    with SessionLocal() as db:
        job = db.get(AnalysisJob, uuid.UUID(job_id))
        if job is None:
            log.error("job_not_found", job_id=job_id)
            return
        job.status = status
        for key, value in kwargs.items():
            setattr(job, key, value)
        db.commit()


def _is_text_file(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            chunk = f.read(8192)
        chunk.decode("utf-8")
        return True
    except (UnicodeDecodeError, OSError):
        return False


def _load_gitignore_spec(repo_root: Path) -> PathSpec:
    gitignore_path = repo_root / ".gitignore"
    patterns: list[str] = []
    if gitignore_path.exists():
        patterns = gitignore_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return PathSpec.from_lines(GitWildMatchPattern, patterns)


def _collect_files(repo_root: Path) -> list[Path]:
    """Walk repo, apply blocklist + gitignore + size gate, return accepted paths."""
    spec = _load_gitignore_spec(repo_root)
    accepted: list[Path] = []

    for dirpath, dirnames, filenames in os.walk(repo_root):
        # Prune blocked directories in-place to prevent os.walk from descending
        dirnames[:] = [
            d for d in dirnames
            if d not in BLOCKLIST_DIRS and not d.startswith(".")
        ]

        for filename in filenames:
            full_path = Path(dirpath) / filename
            rel_path = full_path.relative_to(repo_root)

            if full_path.suffix.lower() in BLOCKLIST_EXTENSIONS:
                continue
            if spec.match_file(str(rel_path)):
                continue
            if full_path.stat().st_size > MAX_FILE_BYTES:
                log.debug("file_too_large", path=str(rel_path), size=full_path.stat().st_size)
                continue
            if not _is_text_file(full_path):
                continue

            accepted.append(full_path)

    return accepted



def _build_file_tree(files: list[Path], repo_root: Path) -> dict[str, Any]:
    """Build a nested dict representing the repository file tree."""
    tree: dict[str, Any] = {}
    for path in files:
        parts = path.relative_to(repo_root).parts
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = None
    return tree


# ── Celery Task ───────────────────────────────────────────────────────────────


@celery_app.task(
    bind=True,
    name="app.tasks.ingest.task_analyze_repo",
    max_retries=2,
    default_retry_delay=30,
    acks_late=True,
    reject_on_worker_lost=True,
)
def task_analyze_repo(
    self: Task,
    job_id: str,
    repo_url: str,
    *,
    github_token: str | None = None,
) -> dict[str, Any]:
    """
    Stage 1 — Clone, filter, and parse a repository.

    Returns a summary dict; the full result is persisted in Postgres.
    """
    logger = log.bind(job_id=job_id, repo_url=repo_url)
    scratch_dir = Path(os.getenv("REPO_SCRATCH_DIR", "/tmp/decouple_repos"))
    clone_path = scratch_dir / job_id

    try:
        # ── Stage 1: Clone ────────────────────────────────────────────────
        logger.info("cloning_repo")
        _update_job_status(job_id, JobStatus.CLONING)
        scratch_dir.mkdir(parents=True, exist_ok=True)

        clone_url = repo_url
        if github_token:
            # Inject token into HTTPS URL for private repos
            clone_url = repo_url.replace("https://", f"https://{github_token}@")

        Repo.clone_from(
            clone_url,
            clone_path,
            depth=1,                    # shallow clone — history not needed
            no_single_branch=False,
        )
        logger.info("clone_complete", path=str(clone_path))

        # ── Stage 2: Filter files ─────────────────────────────────────────
        logger.info("filtering_files")
        _update_job_status(job_id, JobStatus.PARSING)

        accepted_files = _collect_files(clone_path)
        logger.info("files_accepted", count=len(accepted_files))

        # ── Stage 3: Build file tree + count tokens ───────────────────────
        file_tree = _build_file_tree(accepted_files, clone_path)

        total_tokens: int = 0
        for file_path in accepted_files:
            source = file_path.read_text(encoding="utf-8", errors="ignore")
            total_tokens += len(ENCODING.encode(source, disallowed_special=()))

        logger.info("persisting_results", total_tokens=total_tokens)

        # ── Stage 4 → 5: Deep AST analysis + dispatch LLM task ───────────
        python_files = [f for f in accepted_files if f.suffix == ".py"]
        analyzer = ASTAnalyzer(repo_root=clone_path, python_files=python_files)
        ast_result = analyzer.analyze(
            repo_name=clone_path.name,
            total_files=len(accepted_files),
            total_tokens=total_tokens,
        )
        enriched_summary = analyzer.to_dict(ast_result)

        _update_job_status(
            job_id,
            JobStatus.ANALYZING,
            total_files=len(accepted_files),
            total_tokens=total_tokens,
            file_tree=file_tree,
            ast_summary=enriched_summary,
        )
        logger.info("ingestion_complete", job_id=job_id)

        # Dispatch the LLM blueprint task on the dedicated analysis queue
        from app.tasks.analyze import task_generate_blueprint  # noqa: PLC0415
        task_generate_blueprint.apply_async(args=[job_id], queue="analysis")

        return {"job_id": job_id, "total_files": len(accepted_files), "total_tokens": total_tokens}

    except (GitCommandError, InvalidGitRepositoryError) as exc:
        logger.error("clone_failed", error=str(exc))
        _update_job_status(job_id, JobStatus.FAILED, error_message=f"Clone failed: {exc}")
        raise self.retry(exc=exc)

    except Exception as exc:
        logger.exception("ingestion_failed", error=str(exc))
        _update_job_status(job_id, JobStatus.FAILED, error_message=str(exc))
        raise

    finally:
        if clone_path.exists():
            shutil.rmtree(clone_path, ignore_errors=True)
            logger.debug("scratch_cleaned", path=str(clone_path))
