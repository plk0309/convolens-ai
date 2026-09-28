import type { Meeting } from "../api";

const LABELS: Record<string, string> = {
  uploaded: "Queued",
  queued: "Queued",
  extracting_audio: "Extracting audio",
  transcribing: "Transcribing",
  saving: "Saving",
  completed: "Ready",
  failed: "Failed",
};

export default function StatusPill({ meeting }: { meeting: Meeting }) {
  const { status, progress } = meeting;
  const done = status === "completed";
  const failed = status === "failed";
  const busy = !done && !failed;

  const tone = done ? "bg-ok/10 text-ok" : failed ? "bg-fail/10 text-fail" : "bg-cobalt/10 text-cobalt";
  const dot = done
    ? "bg-ok"
    : failed
      ? "bg-fail"
      : "bg-cobalt animate-[pulse-dot_1.4s_ease-in-out_infinite]";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${tone}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {LABELS[status] ?? status}
      {busy && progress > 0 ? <span className="tabular-nums">{progress}%</span> : null}
    </span>
  );
}