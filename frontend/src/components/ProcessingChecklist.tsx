import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Meeting } from "../api";

const ORDER = ["queued", "extracting_audio", "transcribing", "saving", "completed"];
const STEPS = [
  { label: "Waiting for worker" },
  { label: "Extracting audio" },
  { label: "Transcribing speech" },
  { label: "Saving transcript" },
];

export default function ProcessingChecklist({ meeting }: { meeting: Meeting }) {
  const current = Math.max(ORDER.indexOf(meeting.status), 0);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-500"
          style={{ width: `${meeting.progress}%` }}
        />
      </div>

      <ul className="space-y-3">
        {STEPS.map((step, i) => {
          const done = meeting.status === "completed" || i < current;
          const active = !done && i === current;
          return (
            <li key={step.label} className="flex items-center gap-3 text-sm">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : active ? (
                <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
              ) : (
                <Circle className="h-5 w-5 text-neutral-600" />
              )}
              <span className={done ? "text-neutral-300" : active ? "text-white" : "text-neutral-500"}>
                {step.label}
                {active && i === 2 ? ` (${meeting.progress}%)` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}