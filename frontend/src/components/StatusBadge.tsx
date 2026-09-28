import type { Meeting } from "../api";

const LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  queued: "Queued",
  extracting_audio: "Extracting audio",
  transcribing: "Transcribing",
  saving: "Saving",
  completed: "Completed",
  failed: "Failed",
};

export default function StatusBadge({ meeting }: { meeting: Meeting }) {
  const { status, progress } = meeting;
  const color =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "failed"
        ? "bg-red-500/15 text-red-300"
        : "bg-sky-500/15 text-sky-300";
  const inProgress = status !== "completed" && status !== "failed";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {LABELS[status] ?? status}
      {inProgress && progress > 0 ? ` · ${progress}%` : ""}
    </span>
  );
}