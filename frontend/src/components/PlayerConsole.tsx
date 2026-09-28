import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import type { useMediaController } from "../hooks/useMediaController";
import { formatTime } from "../utils";
import WaveStrip from "./WaveStrip";

const SPEEDS = [1, 1.25, 1.5, 2];

interface Props {
  src: string;
  video: boolean;
  duration: number;
  getLevels: (bars: number) => number[];
  media: ReturnType<typeof useMediaController>;
}

export default function PlayerConsole({ src, video, duration, getLevels, media }: Props) {
  const { bind, time, playing, rate, failed, toggle, seek, skip, setRate } = media;
  const nextRate = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length];

  const iconButton =
    "grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white";

  return (
    <div className="on-dark rounded-[28px] bg-ink p-4 text-white shadow-[0_18px_40px_-18px_rgba(15,27,42,0.6)] md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {video ? (
          <video
            {...bind}
            src={src}
            playsInline
            onClick={toggle}
            className="aspect-video w-full rounded-2xl bg-black md:w-64"
          />
        ) : (
          <audio {...bind} src={src} className="hidden" />
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-1.5">
            <button
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className="mr-2 grid h-12 w-12 place-items-center rounded-full bg-white text-ink hover:bg-cobalt-soft"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
            </button>

            <button onClick={() => skip(-10)} aria-label="Back 10 seconds" title="Back 10 seconds" className={iconButton}>
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={() => skip(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds" className={iconButton}>
              <RotateCw className="h-4 w-4" />
            </button>

            <span className="ml-3 text-sm tabular-nums text-white/80">
              {formatTime(time)} <span className="text-white/45">of {formatTime(duration)}</span>
            </span>

            <button
              onClick={() => setRate(nextRate)}
              aria-label={`Playback speed ${rate}×. Click to change.`}
              className="ml-auto rounded-full border border-white/20 px-3 py-1.5 text-sm tabular-nums hover:bg-white/10"
            >
              {rate}×
            </button>
          </div>

          <WaveStrip
            tone="dark"
            playhead
            height={72}
            getLevels={getLevels}
            duration={duration}
            position={duration ? time / duration : 0}
            onSeek={(f) => seek(f * duration)}
            label="Recording timeline"
          />
        </div>
      </div>

      {failed && (
        <p className="mt-4 text-sm text-white/70">
          Your browser can't play this file format. The transcript is still available.
        </p>
      )}
    </div>
  );
}