export function formatTime(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${r}` : `${m}:${r}`;
}

export const isTerminal = (status?: string) => status === "completed" || status === "failed";

export const isVideo = (filename: string) => /\.(mp4|mov|webm)$/i.test(filename);