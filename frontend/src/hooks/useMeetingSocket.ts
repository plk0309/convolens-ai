import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Meeting } from "../api";

/** Streams live progress into the React Query cache while a meeting is processing. */
export function useMeetingSocket(id: string, active: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!active) return;

    let ws: WebSocket | null = null;
    let closed = false;
    let retry: number | undefined;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws/meetings/${id}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;

        qc.setQueryData<Meeting>(["meeting", id], (old) =>
          old ? { ...old, status: data.status, progress: data.progress, error: data.error } : old,
        );

        if (data.status === "completed" || data.status === "failed") {
          qc.invalidateQueries({ queryKey: ["meeting", id] });
          qc.invalidateQueries({ queryKey: ["transcript", id] });
          qc.invalidateQueries({ queryKey: ["meetings"] });
        }
      };

      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      ws?.close();
    };
  }, [id, active, qc]);
}