#!/bin/bash
set -e

# Start Celery worker in background
celery -A app.worker worker --loglevel=info -Q ingestion,analysis --concurrency=2 &

# Start FastAPI - Railway injects PORT as an env var
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
