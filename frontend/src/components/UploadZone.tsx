import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { DuplicateMeetingError, uploadMeeting } from "../api";

const ACCEPT = ".mp3,.mp4,.wav,.m4a,.webm,.mov";

interface Duplicate {
  existingId: string;
  title: string;
  file: File;
}

export default function UploadZone() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

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
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setProgress(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void send(file);
  }

  const uploading = progress !== null;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging ? "border-sky-400 bg-sky-500/10" : "border-neutral-700 hover:border-neutral-500"
        }`}
      >
        <UploadCloud className="mb-3 h-10 w-10 text-sky-400" />
        <p className="text-lg font-medium">Drag & drop a meeting recording</p>
        <p className="mt-1 text-sm text-neutral-400">MP3 · MP4 · WAV · M4A · WEBM · MOV</p>

        {uploading ? (
          <div className="mt-5 w-full max-w-sm">
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">Uploading… {progress}%</p>
          </div>
        ) : (
          <button className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400">
            Choose file
          </button>
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

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {duplicate && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="text-amber-200">
            This recording looks identical to <strong>{duplicate.title}</strong>, which is already uploaded.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => navigate(`/meetings/${duplicate.existingId}`)}
              className="rounded-md bg-amber-500 px-3 py-1.5 font-medium text-neutral-950 hover:bg-amber-400"
            >
              Open existing
            </button>
            <button
              onClick={() => void send(duplicate.file, true)}
              className="rounded-md border border-neutral-600 px-3 py-1.5 hover:bg-neutral-800"
            >
              Upload anyway
            </button>
          </div>
        </div>
      )}
    </div>
  );
}