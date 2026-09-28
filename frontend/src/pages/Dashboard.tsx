import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { deleteMeeting, listMeetings } from "../api";
import StatusPill from "../components/StatusPill";
import UploadBay from "../components/UploadBay";
import { formatDate, formatDuration, isTerminal, languageName } from "../utils";

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: listMeetings,
    refetchInterval: (q) => (q.state.data?.some((m) => !isTerminal(m.status)) ? 5000 : false),
  });

  const remove = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });

  return (
    <div className="space-y-14">
      <UploadBay />

      <section>
        <h2 className="mb-5 text-2xl font-semibold tracking-tight">Meetings</h2>

        {isLoading && <p className="text-mute">Loading your meetings</p>}

        {error && (
          <p className="rounded-2xl border border-fail/30 bg-fail/5 px-5 py-4 text-fail">
            The API isn't responding. Start the backend on port 8000 and refresh this page.
          </p>
        )}

        {!isLoading && !error && meetings.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line px-6 py-12 text-center">
            <p className="text-lg font-medium">No meetings yet</p>
            <p className="mt-1 text-mute">
              Drop a recording above. Transcription runs in the background, so you can close the tab.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {meetings.map((m) => {
            const busy = !isTerminal(m.status);
            const lang = languageName(m.language);
            return (
              <li key={m.id} className="group flex items-center gap-2">
                <Link
                  to={`/meetings/${m.id}`}
                  className="block min-w-0 flex-1 rounded-2xl border border-line bg-panel px-5 py-4 transition-colors hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-medium">{m.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-mute">
                        <span>{formatDate(m.created_at)}</span>
                        {m.duration ? <span>{formatDuration(m.duration)}</span> : null}
                        {lang ? <span>{lang}</span> : null}
                      </p>
                    </div>
                    <StatusPill meeting={m} />
                  </div>
                  {busy && (
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-cobalt transition-all duration-500"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  )}
                </Link>

                <button
                  aria-label={`Delete ${m.title}`}
                  title="Delete meeting"
                  onClick={() => {
                    if (confirm(`Delete "${m.title}"? The recording and its transcript will be removed.`)) {
                      remove.mutate(m.id);
                    }
                  }}
                  className="rounded-full p-3 text-mute hover:bg-white hover:text-fail md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}