import { memo, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Search } from "lucide-react";
import type { Segment } from "../api";
import { formatTime } from "../utils";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scrollToSegment(idx: number) {
  const el = document.getElementById(`seg-${idx}`);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

interface RowProps {
  seg: Segment;
  active: boolean;
  focused: boolean;
  query: string;
  onSeek: (seconds: number) => void;
}

const Row = memo(function Row({ seg, active, focused, query, onSeek }: RowProps) {
  return (
    <div
      id={`seg-${seg.idx}`}
      className={`grid grid-cols-[4.25rem_1fr] gap-x-4 border-l-[3px] px-5 py-3.5 ${
        active ? "border-cobalt bg-white" : "border-transparent"
      } ${focused ? "ring-2 ring-inset ring-signal" : ""}`}
    >
      <button
        onClick={() => onSeek(seg.start_time)}
        title="Play from here"
        className="self-start pt-1 text-left text-sm font-medium tabular-nums text-cobalt hover:underline"
      >
        {formatTime(seg.start_time)}
      </button>
      <p
        onClick={() => {
          if (!window.getSelection()?.toString()) onSeek(seg.start_time);
        }}
        className="cursor-pointer font-serif text-[1.075rem] leading-relaxed"
      >
        <Highlight text={seg.text} query={query} />
      </p>
    </div>
  );
});

interface Props {
  segments: Segment[];
  activeIdx: number;
  playing: boolean;
  onSeek: (seconds: number) => void;
}

export default function Transcript({ segments, activeIdx, playing, onSeek }: Props) {
  const [query, setQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const [matchPos, setMatchPos] = useState(0);
  const [copied, setCopied] = useState(false);

  const q = query.trim();

  const matches = useMemo(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(needle)).map((s) => s.idx);
  }, [segments, q]);

  useEffect(() => {
    setMatchPos(0);
    if (matches.length) scrollToSegment(matches[0]);
  }, [matches]);

  useEffect(() => {
    if (follow && playing && !q && activeIdx >= 0) scrollToSegment(segments[activeIdx].idx);
  }, [activeIdx, follow, playing, q, segments]);

  function step(dir: 1 | -1) {
    if (!matches.length) return;
    const next = (matchPos + dir + matches.length) % matches.length;
    setMatchPos(next);
    scrollToSegment(matches[next]);
  }

  async function copy() {
    const text = segments.map((s) => `[${formatTime(s.start_time)}] ${s.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (segments.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-panel px-6 py-8 text-mute">
        No speech was detected in this recording. Check that the file has audible audio, then upload it again.
      </p>
    );
  }

  const focusedIdx = matches[matchPos];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-2xl font-semibold tracking-tight">Transcript</h2>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && step(e.shiftKey ? -1 : 1)}
            placeholder="Search this transcript"
            aria-label="Search this transcript"
            className="w-64 rounded-full border border-line bg-panel py-2 pl-10 pr-4 text-sm placeholder:text-mute"
          />
        </div>

        {q && (
          <div className="flex items-center gap-1 text-sm text-mute">
            <span className="mr-1 tabular-nums">
              {matches.length ? `${matchPos + 1} of ${matches.length}` : "No matches"}
            </span>
            <button
              onClick={() => step(-1)}
              aria-label="Previous match"
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Next match"
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          role="switch"
          aria-checked={follow}
          onClick={() => setFollow((f) => !f)}
          className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm hover:bg-white"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors ${follow ? "bg-cobalt" : "bg-ink/25"}`}>
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                follow ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
          Follow playback
        </button>

        <button
          onClick={() => void copy()}
          className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-white"
        >
          {copied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy transcript"}
        </button>
      </div>

      <div className="divide-y divide-line/60 overflow-hidden rounded-3xl border border-line bg-panel">
        {segments.map((seg, i) => (
          <Row
            key={seg.idx}
            seg={seg}
            active={i === activeIdx}
            focused={seg.idx === focusedIdx && !!q}
            query={q}
            onSeek={onSeek}
          />
        ))}
      </div>
    </section>
  );
}