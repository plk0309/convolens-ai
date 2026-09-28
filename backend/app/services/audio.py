import subprocess
from pathlib import Path


def extract_audio(input_path: Path, output_path: Path) -> Path:
    """Convert any audio/video file to 16 kHz mono WAV (what Whisper expects)."""
    cmd = [
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-vn",            # drop video
        "-ac", "1",       # mono
        "-ar", "16000",   # 16 kHz
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")
    return output_path