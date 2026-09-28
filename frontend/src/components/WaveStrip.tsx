import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { formatTime } from "../utils";

interface Props {
  getLevels: (bars: number) => number[];
  position?: number; // 0..1
  duration?: number; // seconds; enables tooltip and time ruler
  tone?: "light" | "dark";
  height?: number;
  playhead?: boolean;
  animate?: boolean;
  label?: string;
  onSeek?: (fraction: number) => void;
}

export default function WaveStrip({
  getLevels,
  position = 0,
  duration,
  tone = "light",
  height = 72,
  playhead = false,
  animate = true,
  label = "Timeline",
  onSeek,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState(96);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setBars(Math.max(24, Math.floor(entry.contentRect.width / 6)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const levels = useMemo(() => getLevels(bars), [getLevels, bars]);
  const dark = tone === "dark";
  const played = dark ? "bg-cobalt-soft" : "bg-cobalt";
  const idle = dark ? "bg-white/25" : "bg-ink/20";

  function fractionAt(e: MouseEvent) {
    const rect = ref.current!.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!onSeek) return;
    const step = duration ? 5 / duration : 0.02;
    if (e.key === "ArrowRight") onSeek(Math.min(position + step, 1));
    if (e.key === "ArrowLeft") onSeek(Math.max(position - step, 0));
  }

  return (
    <div>
      <div
        ref={ref}
        role={onSeek ? "slider" : undefined}
        aria-label={onSeek ? label : undefined}
        aria-valuemin={onSeek ? 0 : undefined}
        aria-valuemax={onSeek ? 100 : undefined}
        aria-valuenow={onSeek ? Math.round(position * 100) : undefined}
        tabIndex={onSeek ? 0 : undefined}
        className="relative flex items-end gap-[2px] rounded-md select-none"
        style={{ height, cursor: onSeek ? "pointer" : "default" }}
        onMouseMove={(e) => onSeek && setHover(fractionAt(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onSeek?.(fractionAt(e))}
        onKeyDown={onKeyDown}
      >
        {levels.map((v, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-[height,background-color] duration-300 ${
              animate ? "wave-bar" : ""
            } ${(i + 0.5) / bars <= position ? played : idle}`}
            style={{ height: `${Math.max(v, 0.06) * 100}%`, "--i": i } as CSSProperties}
          />
        ))}

        {playhead && (
          <div
            className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-signal transition-[left] duration-300 ease-linear"
            style={{ left: `${position * 100}%` }}
          />
        )}

        {hover !== null && duration ? (
          <div
            className={`pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
              dark ? "bg-white text-ink" : "bg-ink text-white"
            }`}
            style={{ left: `${hover * 100}%` }}
          >
            {formatTime(hover * duration)}
          </div>
        ) : null}
      </div>

      {duration ? (
        <div
          className={`mt-2 flex justify-between text-xs tabular-nums ${dark ? "text-white/55" : "text-mute"}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f}>{formatTime(duration * f)}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}