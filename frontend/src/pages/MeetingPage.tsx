import { useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { deleteMeeting, getMeeting, getTranscript } from "../api";
import type { Segment } from "../api";
import PlayerConsole from "../components/PlayerConsole";
import ProcessingPanel from "../components/ProcessingPanel";
import StatusPill from "../components/StatusPill";
import Transcript from "../components/Transcript";
import { useMediaController } from "../hooks/useMediaController";
import { useMeetingSocket } from "../hooks/useMeetingSocket";
import {
  findActiveIndex,
  formatDate,
  formatDuration,
  isTerminal,
  isVideo,
  languageName,
  speechLevels,
} from "../utils";

const NO_SEGMENTS: Segment[] = [];

export default function MeetingPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const media = useMediaController();

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => getMeeting(id),
    refetchInterval: (q) => (isTerminal(q.state.data?.status) ? false : 5000), // safety net behind the WebSocket
  });

  const processing = !!meeting && !isTerminal(meeting.status);
  useMeetingSocket(id, processing);

  const { data } = useQuery({
    queryKey: ["transcript", id],
    queryFn: () => getTranscript(id),
    enabled: meeting?.status === "completed",
  });
  const segments = data ?? NO_SEGMENTS;

  const remove = useMutation({
    mutationFn: () => deleteMeeting(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meetings"] });
      navigate("/");
    },
  });

  const duration = meeting?.duration ?? segments[segments.length - 1]?.end_time ?? 0;
  const getLevels = useCallback((bars: number) => speechLevels(segments, duration, bars), [segments, duration]);
  const activeIdx = useMemo(() => findActiveIndex(segments, media.time), [segments, media.time]);

  if (isLoading) return <p className="text-mute">Loading meeting</p>;
  if (error || !meeting) {
    return (
      <p className="text-mute">
        We couldn't find that meeting. <Link to="/" className="text-cobalt underline">Go back to your meetings</Link>.
      </p>
    );
  }

  const lang = languageName(meeting.language);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-mute hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Meetings
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words text-4xl font-semibold tracking-tight md:text-5xl">{meeting.title}</h1>
            <p className="mt-3 flex flex-wrap gap-x-4 text-mute">
              <span>{formatDate(meeting.created_at)}</span>
              {meeting.duration ? <span>{formatDuration(meeting.duration)}</span> : null}
              {lang ? <span>{lang}</span> : null}
            </p>
          </div>
          <StatusPill meeting={meeting} />
        </div>
      </div>

      {meeting.status === "failed" && (
        <div className="rounded-3xl border border-fail/30 bg-fail/5 p-6">
          <p className="text-lg font-semibold text-fail">Processing failed</p>
          <p className="mt-2 break-words text-sm">{meeting.error ?? "No error details were recorded."}</p>
          <p className="mt-2 text-sm text-mute">
            The worker terminal has the full traceback. Fix the cause, then delete this meeting and upload the file
            again.
          </p>
          <button
            onClick={() => remove.mutate()}
            className="mt-4 rounded-full border border-fail/40 px-5 py-2 text-sm font-medium text-fail hover:bg-fail/10"
          >
            Delete meeting
          </button>
        </div>
      )}

      {processing && <ProcessingPanel meeting={meeting} />}

      {meeting.status === "completed" && (
        <>
          <div className="sticky top-3 z-20">
            <PlayerConsole
              src={`/api/meetings/${meeting.id}/media`}
              video={isVideo(meeting.filename)}
              duration={duration}
              getLevels={getLevels}
              media={media}
            />
          </div>

          <Transcript
            segments={segments}
            activeIdx={activeIdx}
            playing={media.playing}
            onSeek={(t) => media.seek(t, true)}
          />
        </>
      )}
    </div>
  );
}