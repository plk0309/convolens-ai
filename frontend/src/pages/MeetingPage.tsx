import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getMeeting, getTranscript } from "../api";
import ProcessingChecklist from "../components/ProcessingChecklist";
import StatusBadge from "../components/StatusBadge";
import { useMeetingSocket } from "../hooks/useMeetingSocket";
import { formatTime, isTerminal, isVideo } from "../utils";

export default function MeetingPage() {
  const { id = "" } = useParams();
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => getMeeting(id),
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : 5000), // safety net
  });

  const processing = !!meeting && !isTerminal(meeting.status);
  useMeetingSocket(id, processing);

  const { data: segments = [] } = useQuery({
    queryKey: ["transcript", id],
    queryFn: () => getTranscript(id),
    enabled: meeting?.status === "completed",
  });

  function seek(seconds: number) {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = seconds;
    void el.play();
  }

  if (isLoading) return <p className="text-neutral-400">Loading…</p>;
  if (error || !meeting) return <p className="text-red-300">Meeting not found.</p>;

  const activeIdx = segments.findIndex((s) => currentTime >= s.start_time && currentTime < s.end_time);
  const mediaUrl = `/api/meetings/${meeting.id}/media`;

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All meetings
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="mt-1 text-sm text-neutral-400">
            {new Date(meeting.created_at).toLocaleString()}
            {meeting.duration ? ` · ${formatTime(meeting.duration)}` : ""}
            {meeting.language ? ` · ${meeting.language.toUpperCase()}` : ""}
          </p>
        </div>
        <StatusBadge meeting={meeting} />
      </div>

      {meeting.status === "failed" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm">
          <p className="font-medium text-red-200">Processing failed</p>
          <p className="mt-1 break-words text-red-300/80">{meeting.error ?? "Unknown error"}</p>
        </div>
      )}

      {processing && <ProcessingChecklist meeting={meeting} />}

      {meeting.status === "completed" && (
        <>
          {isVideo(meeting.filename) ? (
            <video
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={mediaUrl}
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="max-h-96 w-full rounded-xl bg-black"
            />
          ) : (
            <audio
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={mediaUrl}
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              className="w-full"
            />
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold">Transcript</h2>
            {segments.length === 0 ? (
              <p className="text-neutral-400">No speech detected in this recording.</p>
            ) : (
              <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
                {segments.map((s, i) => (
                  <li key={s.idx}>
                    <button
                      onClick={() => seek(s.start_time)}
                      className={`flex w-full gap-4 px-5 py-3 text-left text-sm hover:bg-neutral-800 ${
                        i === activeIdx ? "bg-sky-500/10" : ""
                      }`}
                    >
                      <span className="w-14 shrink-0 font-mono text-xs text-sky-400">
                        {formatTime(s.start_time)}
                      </span>
                      <span className={i === activeIdx ? "text-white" : "text-neutral-300"}>{s.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}