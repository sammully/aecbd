import os
from celery import Celery
from celery.schedules import crontab

BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Note: We append apps/api to path so we can import the models
import sys
api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/api'))
sys.path.append(api_path)
sys.path.append('/apps/api') # For docker mount

app = Celery(
    "aec_ingestion",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=['tasks']
)

# Optional: Configuration for Celery Beat schedule
app.conf.beat_schedule = {
    'ingest-all-sources-every-30-mins': {
        'task': 'tasks.ingest_all_sources',
        'schedule': crontab(minute='*/30'),
    },
}
app.conf.timezone = 'UTC'
