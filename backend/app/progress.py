import json
import uuid

import redis

from app.config import settings
from app.db import SessionLocal
from app.models import Meeting

_redis = redis.Redis.from_url(settings.redis_url, decode_responses=True)

TERMINAL = {"completed", "failed"}


def channel(meeting_id: uuid.UUID | str) -> str:
    return f"meeting:{meeting_id}"


def update_status(
    meeting_id: uuid.UUID,
    status: str,
    progress: int | None = None,
    error: str | None = None,
) -> None:
    """Persist status in Postgres and broadcast it to any WebSocket listeners."""
    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)
        if meeting is None:
            return
        meeting.status = status
        if progress is not None:
            meeting.progress = progress
        meeting.error = error
        db.commit()
        payload = {
            "id": str(meeting_id),
            "status": meeting.status,
            "progress": meeting.progress,
            "error": error,
        }
    _redis.publish(channel(meeting_id), json.dumps(payload))