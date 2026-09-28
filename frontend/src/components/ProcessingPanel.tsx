import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import type { Meeting } from "../api";
import { placeholderLevels } from "../utils";
import WaveStrip from "./WaveStrip";

const STAGES = [
  { key: "queued", label: "Waiting for a free worker" },
  { key: "extracting_audio", label: "Extracting audio" },
  { key: "transcribing", label: "Transcribing speech" },
  { key: "saving", label: "Saving transcript" },
];

const scanLevels = (n: number) => placeholderLevels(n);

export default function ProcessingPanel({ meeting }: { meeting: Meeting }) {
  const found = STAGES.findIndex((s) => s.key === meeting.status);
  const current = found === -1 ? 0 : found;

  return (
    <section className="on-dark rounded-[28px] bg-ink p-7 text-white md:p-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{STAGES[current].label}</h2>
        <span className="tabular-nums text-white/70">{meeting.progress}%</span>
      </div>

      <div className="mt-6">
        <WaveStrip tone="dark" height={88} animate={false} getLevels={scanLevels} position={meeting.progress / 100} />
      </div>

      <ul className="mt-8 space-y-3">
        {STAGES.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={stage.key} className="flex items-center gap-3">
              {done ? (
                <CircleCheck className="h-5 w-5 text-cobalt-soft" />
              ) : active ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Circle className="h-5 w-5 text-white/30" />
              )}
              <span className={done ? "text-white/70" : active ? "text-white" : "text-white/40"}>{stage.label}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-sm text-white/55">
        You can leave this page. Processing continues in the background, and the meeting will be ready when you return.
      </p>
    </section>
  );
}