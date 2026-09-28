import uuid
from pathlib import Path

from sqlalchemy import delete

from app.celery_app import celery_app
from app.db import SessionLocal
from app.models import Meeting, TranscriptSegment
from app.progress import update_status
from app.services.audio import extract_audio
from app.services.transcription import transcribe


@celery_app.task(name="process_meeting")
def process_meeting(meeting_id: str) -> None:
    mid = uuid.UUID(meeting_id)
    try:
        with SessionLocal() as db:
            meeting = db.get(Meeting, mid)
            if meeting is None:
                return
            original = Path(meeting.file_path)
        folder = original.parent

        # 1. audio extraction  (0 -> 10 %)
        update_status(mid, "extracting_audio", 2)
        wav_path = extract_audio(original, folder / "audio.wav")

        # 2. transcription  (10 -> 90 %)
        update_status(mid, "transcribing", 10)
        last = {"p": 10}

        def on_progress(fraction: float) -> None:
            p = 10 + int(fraction * 80)
            if p >= last["p"] + 2:      # throttle DB/Redis writes
                last["p"] = p
                update_status(mid, "transcribing", p)

        result = transcribe(wav_path, on_progress=on_progress)

        # 3. persist  (90 -> 100 %)
        update_status(mid, "saving", 92)
        with SessionLocal() as db:
            db.execute(delete(TranscriptSegment).where(TranscriptSegment.meeting_id == mid))
            db.add_all([
                TranscriptSegment(
                    meeting_id=mid,
                    idx=i,
                    start_time=s["start"],
                    end_time=s["end"],
                    text=s["text"],
                )
                for i, s in enumerate(result["segments"])
            ])
            meeting = db.get(Meeting, mid)
            meeting.duration = result["duration"]
            meeting.language = result["language"]
            db.commit()

        update_status(mid, "completed", 100)

    except Exception as exc:
        update_status(mid, "failed", error=str(exc)[:1000])
        raise