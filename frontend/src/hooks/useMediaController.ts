import { useCallback, useRef, useState } from "react";
import type { SyntheticEvent } from "react";

export function useMediaController() {
  const ref = useRef<HTMLMediaElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const [failed, setFailed] = useState(false);

  const bind = {
    ref: (el: HTMLMediaElement | null) => {
      ref.current = el;
    },
    onTimeUpdate: (e: SyntheticEvent<HTMLMediaElement>) => setTime(e.currentTarget.currentTime),
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onError: () => setFailed(true),
    preload: "metadata" as const,
  };

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const seek = useCallback((seconds: number, autoplay = false) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, seconds);
    setTime(el.currentTime);
    if (autoplay) void el.play();
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const el = ref.current;
      if (el) seek(el.currentTime + delta);
    },
    [seek],
  );

  const setRate = useCallback((r: number) => {
    const el = ref.current;
    if (el) el.playbackRate = r;
    setRateState(r);
  }, []);

  return { bind, time, playing, rate, failed, toggle, seek, skip, setRate };
}