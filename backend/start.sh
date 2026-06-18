#!/bin/bash
set -e

PORT="${PORT:-8000}"

# Start Celery worker in background
celery -A app.worker worker --loglevel=info -Q ingestion,analysis --concurrency=2 &
CELERY_PID=$!

# Start FastAPI
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"

# If uvicorn exits, kill the worker too
kill $CELERY_PID
