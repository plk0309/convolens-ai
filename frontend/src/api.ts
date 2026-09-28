import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export interface Meeting {
  id: string;
  title: string;
  filename: string;
  duration: number | null;
  language: string | null;
  status: string;
  progress: number;
  error: string | null;
  created_at: string;
}

export interface Segment {
  idx: number;
  start_time: number;
  end_time: number;
  text: string;
}

export class DuplicateMeetingError extends Error {
  existingId: string;
  title: string;

  constructor(existingId: string, title: string) {
    super("This recording was already uploaded");
    this.existingId = existingId;
    this.title = title;
  }
}

export async function uploadMeeting(
  file: File,
  onProgress?: (percent: number) => void,
  force = false,
): Promise<Meeting> {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await api.post<Meeting>("/meetings", form, {
      params: force ? { force: true } : undefined,
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const detail = err.response.data?.detail;
      if (err.response.status === 409 && detail?.existing_id) {
        throw new DuplicateMeetingError(detail.existing_id, detail.title);
      }
      if (typeof detail === "string") throw new Error(detail);
    }
    throw err;
  }
}

export const listMeetings = () => api.get<Meeting[]>("/meetings").then((r) => r.data);
export const getMeeting = (id: string) => api.get<Meeting>(`/meetings/${id}`).then((r) => r.data);
export const getTranscript = (id: string) =>
  api.get<Segment[]>(`/meetings/${id}/transcript`).then((r) => r.data);
export const deleteMeeting = (id: string) => api.delete(`/meetings/${id}`);