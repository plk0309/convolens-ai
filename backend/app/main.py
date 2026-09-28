import hashlib
import json
import shutil
import uuid
from pathlib import Path

import redis.asyncio as aioredis
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.config import settings
from app.db import SessionLocal, get_db
from app.models import Meeting, TranscriptSegment
from app.progress import TERMINAL, channel
from app.schemas import MeetingOut, SegmentOut

ALLOWED_EXT = {".mp3", ".mp4", ".wav", ".m4a", ".webm", ".mov"}
CHUNK = 1024 * 1024  # 1 MB

app = FastAPI(title="ConvoLens-ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/meetings", response_model=MeetingOut, status_code=201)
def upload_meeting(
    file: UploadFile = File(...),
    force: bool = Query(False, description="Upload even if an identical file exists"),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXT)}")

    tmp_dir = settings.data_dir / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = tmp_dir / f"{uuid.uuid4().hex}{ext}"

    # stream to disk while hashing (never load the whole file into RAM)
    sha = hashlib.sha256()
    size = 0
    limit = settings.max_upload_mb * 1024 * 1024
    try:
        with tmp_path.open("wb") as out:
            while chunk := file.file.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB limit")
                sha.update(chunk)
                out.write(chunk)
    except HTTPException:
        tmp_path.unlink(missing_ok=True)
        raise

    if size == 0:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(400, "Uploaded file is empty")

    digest = sha.hexdigest()

    # duplicate detection
    if not force:
        existing = db.scalar(select(Meeting).where(Meeting.file_hash == digest))
        if existing:
            tmp_path.unlink(missing_ok=True)
            raise HTTPException(
                409,
                detail={
                    "message": "This recording was already uploaded",
                    "existing_id": str(existing.id),
                    "title": existing.title,
                },
            )

    meeting_id = uuid.uuid4()
    folder = settings.data_dir / "meetings" / str(meeting_id)
    folder.mkdir(parents=True)
    original = folder / f"original{ext}"
    shutil.move(str(tmp_path), original)

    meeting = Meeting(
        id=meeting_id,
        title=Path(file.filename).stem,
        filename=file.filename,
        file_path=str(original),
        file_hash=digest,
        status="queued",
        progress=0,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    celery_app.send_task("process_meeting", args=[str(meeting_id)])
    return meeting


@app.get("/api/meetings", response_model=list[MeetingOut])
def list_meetings(db: Session = Depends(get_db)):
    return db.scalars(select(Meeting).order_by(Meeting.created_at.desc())).all()


def _get_meeting(db: Session, meeting_id: uuid.UUID) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    return meeting


@app.get("/api/meetings/{meeting_id}", response_model=MeetingOut)
def get_meeting(meeting_id: uuid.UUID, db: Session = Depends(get_db)):
    return _get_meeting(db, meeting_id)


@app.get("/api/meetings/{meeting_id}/transcript", response_model=list[SegmentOut])
def get_transcript(meeting_id: uuid.UUID, db: Session = Depends(get_db)):
    _get_meeting(db, meeting_id)
    return db.scalars(
        select(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.idx)
    ).all()


@app.get("/api/meetings/{meeting_id}/media")
def get_media(meeting_id: uuid.UUID, db: Session = Depends(get_db)):
    meeting = _get_meeting(db, meeting_id)
    path = Path(meeting.file_path)
    if not path.exists():
        raise HTTPException(404, "Media file missing")
    return FileResponse(path)  # supports Range requests, so seeking works


@app.delete("/api/meetings/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: uuid.UUID, db: Session = Depends(get_db)):
    meeting = _get_meeting(db, meeting_id)
    folder = Path(meeting.file_path).parent
    db.delete(meeting)  # child rows go via ON DELETE CASCADE
    db.commit()
    shutil.rmtree(folder, ignore_errors=True)


@app.websocket("/ws/meetings/{meeting_id}")
async def meeting_progress(ws: WebSocket, meeting_id: uuid.UUID):
    await ws.accept()

    r = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(channel(meeting_id))  # subscribe BEFORE reading state: no missed updates
    try:
        with SessionLocal() as db:
            meeting = db.get(Meeting, meeting_id)
            if meeting is None:
                await ws.close(code=4404)
                return
            state = {
                "id": str(meeting.id),
                "status": meeting.status,
                "progress": meeting.progress,
                "error": meeting.error,
            }
        await ws.send_json(state)
        if state["status"] in TERMINAL:
            return

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=15.0)
            if message is None:
                await ws.send_json({"type": "heartbeat"})  # raises if the client is gone
                continue
            data = json.loads(message["data"])
            await ws.send_json(data)
            if data["status"] in TERMINAL:
                return
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        await pubsub.unsubscribe(channel(meeting_id))
        await pubsub.aclose()
        await r.aclose()
        try:
            await ws.close()
        except RuntimeError:
            pass