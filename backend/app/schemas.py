import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    filename: str
    duration: float | None
    language: str | None
    status: str
    progress: int
    error: str | None
    created_at: datetime


class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idx: int
    start_time: float
    end_time: float
    text: str