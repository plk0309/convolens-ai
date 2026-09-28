import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { deleteMeeting, listMeetings } from "../api";
import StatusBadge from "../components/StatusBadge";
import UploadZone from "../components/UploadZone";
import { formatTime, isTerminal } from "../utils";

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
    <div className="space-y-10">
      <UploadZone />

      <section>
        <h2 className="mb-4 text-xl font-semibold">Meetings</h2>

        {isLoading && <p className="text-neutral-400">Loading…</p>}
        {error && <p className="text-red-300">Could not reach the API. Is the backend running?</p>}
        {!isLoading && !error && meetings.length === 0 && (
          <p className="text-neutral-400">No meetings yet. Upload your first recording above.</p>
        )}

        <ul className="space-y-3">
          {meetings.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Link
                to={`/meetings/${m.id}`}
                className="flex flex-1 items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4 hover:border-neutral-600"
              >
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(m.created_at).toLocaleString()}
                    {m.duration ? ` · ${formatTime(m.duration)}` : ""}
                  </p>
                </div>
                <StatusBadge meeting={m} />
              </Link>
              <button
                title="Delete meeting"
                onClick={() => {
                  if (confirm(`Delete "${m.title}"? This removes the recording and transcript.`)) {
                    remove.mutate(m.id);
                  }
                }}
                className="rounded-lg p-3 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}