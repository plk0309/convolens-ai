export function formatTime(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${r}` : `${m}:${r}`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} sec`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function languageName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const isTerminal = (status?: string) => status === "completed" || status === "failed";

export const isVideo = (filename: string) => /\.(mp4|mov|webm)$/i.test(filename);

interface TimedSegment {
  start_time: number;
  end_time: number;
  text: string;
}

/** Words spoken per time bucket, normalised to 0..1 (square-root scaled so quiet parts stay visible). */
export function speechLevels(segments: TimedSegment[], duration: number, buckets: number): number[] {
  const levels = new Array<number>(buckets).fill(0);
  if (duration <= 0) return levels;

  const size = duration / buckets;
  for (const s of segments) {
    const words = s.text.trim().split(/\s+/).filter(Boolean).length;
    const length = Math.max(s.end_time - s.start_time, 0.001);
    const first = Math.min(Math.floor(s.start_time / size), buckets - 1);
    const last = Math.min(Math.floor(s.end_time / size), buckets - 1);
    for (let b = first; b <= last; b++) {
      const from = Math.max(s.start_time, b * size);
      const to = Math.min(s.end_time, (b + 1) * size);
      if (to > from) levels[b] += words * ((to - from) / length);
    }
  }

  const max = Math.max(...levels, 0);
  return max > 0 ? levels.map((v) => Math.sqrt(v / max)) : levels;
}

/** Decorative bar heights for upload and processing states (not real data). */
export function placeholderLevels(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.3 + 0.35 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)));
}

/** Index of the segment playing at time t (binary search), or -1. */
export function findActiveIndex(segments: TimedSegment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start_time <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 && t < segments[found].end_time + 0.5 ? found : -1;
}