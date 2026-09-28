from pathlib import Path
from typing import Callable

from faster_whisper import WhisperModel

from app.config import settings

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        import torch  # imported lazily so the API process never loads it

        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        _model = WhisperModel(settings.whisper_model, device=device, compute_type=compute_type)
    return _model


def transcribe(
    audio_path: Path,
    on_progress: Callable[[float], None] | None = None,
    language: str | None = None,
) -> dict:
    model = get_model()
    segments, info = model.transcribe(
        str(audio_path),
        language=language,      # None = auto-detect
        vad_filter=True,        # skip silence
        beam_size=5,
    )

    result = []
    for seg in segments:  # generator: transcription happens while we iterate
        result.append({
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": seg.text.strip(),
        })
        if on_progress and info.duration:
            on_progress(min(seg.end / info.duration, 1.0))

    return {
        "language": info.language,
        "duration": round(info.duration, 2),
        "segments": result,
    }