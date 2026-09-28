from celery import Celery

from app.config import settings

celery_app = Celery(
    "convolens",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    worker_prefetch_multiplier=1,   # one heavy job at a time
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    broker_transport_options={"visibility_timeout": 6 * 60 * 60},  # long jobs must not be redelivered
)