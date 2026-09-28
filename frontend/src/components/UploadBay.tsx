import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DuplicateMeetingError, uploadMeeting } from "../api";
import { placeholderLevels } from "../utils";
import WaveStrip from "./WaveStrip";

const ACCEPT = ".mp3,.mp4,.wav,.m4a,.webm,.mov";

interface Duplicate {
  existingId: string;
  title: string;
  file: File;
}

export default function UploadBay() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  const uploading = progress !== null;

  const getLevels = useCallback(
    (n: number) => placeholderLevels(n).map((v) => (dragging ? Math.min(1, v * 1.7) : v * 0.75)),
    [dragging],
  );

  async function send(file: File, force = false) {
    setError(null);
    setDuplicate(null);
    setProgress(0);
    try {
      const meeting = await uploadMeeting(file, setProgress, force);
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      navigate(`/meetings/${meeting.id}`);
    } catch (err) {
      if (err instanceof DuplicateMeetingError) {
        setDuplicate({ existingId: err.existingId, title: err.title, file });
      } else {
        const reason = err instanceof Error ? err.message : "Unknown error";
        setError(`${reason}. Check that the backend is running, then try again.`);
      }
    } finally {
      setProgress(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !uploading) void send(file);
  }

  const title = uploading ? "Uploading your recording" : dragging ? "Release to upload" : "Drop in a meeting recording";
  const subtitle = uploading
    ? `${progress}% sent. Keep this tab open until it finishes.`
    : "We transcribe it in the background and link every line to the audio.";

  return (
    <div>
      <section
        className="on-dark overflow-hidden rounded-[28px] bg-ink px-7 py-9 text-white md:px-12 md:py-12"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-md text-lg text-white/70">{subtitle}</p>

            {!uploading && (
              <>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-7 rounded-full bg-white px-6 py-3 font-medium text-ink hover:bg-cobalt-soft"
                >
                  Choose a file
                </button>
                <p className="mt-4 text-sm text-white/50">MP3, MP4, WAV, M4A, WEBM or MOV, up to 1 GB.</p>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void send(file);
                e.target.value = "";
              }}
            />
          </div>

          <WaveStrip
            tone="dark"
            height={128}
            animate={false}
            getLevels={getLevels}
            position={uploading ? (progress ?? 0) / 100 : 0}
          />
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-2xl border border-fail/30 bg-fail/5 px-5 py-4 text-sm text-fail">{error}</p>
      )}

      {duplicate && (
        <div className="mt-4 rounded-2xl border border-signal/40 bg-signal/10 px-5 py-4">
          <p className="font-medium">You've already uploaded this recording</p>
          <p className="mt-1 text-sm text-mute">
            It matches <span className="font-medium text-ink">{duplicate.title}</span>. Open that meeting, or upload
            the file again as a separate one.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/meetings/${duplicate.existingId}`)}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-cobalt"
            >
              Open existing meeting
            </button>
            <button
              onClick={() => void send(duplicate.file, true)}
              className="rounded-full border border-ink/25 px-5 py-2 text-sm font-medium hover:bg-white"
            >
              Upload again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}