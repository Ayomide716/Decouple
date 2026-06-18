#!/bin/bash
set -e

# Start Celery worker in background
celery -A app.worker worker --loglevel=info -Q ingestion,analysis --concurrency=2 &
CELERY_PID=$!

# Start FastAPI
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

# If uvicorn exits, kill the worker too
kill $CELERY_PID
