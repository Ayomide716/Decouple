from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "decouple",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.ingest"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.ingest.task_analyze_repo": {"queue": "ingestion"},
        "app.tasks.analyze.*": {"queue": "analysis"},
    },
    task_queues={
        "ingestion": {"exchange": "ingestion", "routing_key": "ingestion"},
        "analysis": {"exchange": "analysis", "routing_key": "analysis"},
    },
    result_expires=86_400,
)
