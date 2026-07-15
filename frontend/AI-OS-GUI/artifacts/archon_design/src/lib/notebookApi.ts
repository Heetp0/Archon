// Notebook Mode HTTP API client
// All routes run on the SAME FastAPI daemon (port 8765 by default).
// Reuses getDaemonConnectionDetails() from storage.ts to stay in sync with
// whatever host/port the user has configured in Archon Settings.

import { getDaemonConnectionDetails } from "@/lib/storage";
import type {
  Notebook,
  CreateNotebookRequest,
  CreateNotebookResponse,
  Source,
  AddSourceRequest,
  AddSourceResponse,
  ChatRequest,
  ChatResponse,
  StudioArtifact,
  ArtifactType,
  IngestionJob,
} from "@/types/notebook";

function getBaseUrl(): string {
  return getDaemonConnectionDetails().httpUrl;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, {
    headers: { ...headers, ...(options?.headers as Record<string, string> ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Notebook API] ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// Notebooks CRUD
export const notebookApi = {
  listNotebooks: () => request<Notebook[]>("/notebooks"),

  createNotebook: (req: CreateNotebookRequest) =>
    request<CreateNotebookResponse>("/notebooks", {
      method: "POST",
      body: JSON.stringify(req),
    }),

  getNotebook: (id: string) => request<Notebook>(`/notebooks/${id}`),

  deleteNotebook: (id: string) =>
    request<{ status: string }>(`/notebooks/${id}`, { method: "DELETE" }),

  // Sources
  listSources: (notebookId: string) =>
    request<Source[]>(`/notebooks/${notebookId}/sources`),

  addSource: (notebookId: string, req: AddSourceRequest) =>
    request<AddSourceResponse>(`/notebooks/${notebookId}/sources`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  addSourceFile: (notebookId: string, file: File, sourceType: "pdf" | "audio") => {
    const form = new FormData();
    form.append("file", file);
    form.append("source_type", sourceType);
    return request<AddSourceResponse>(`/notebooks/${notebookId}/sources`, {
      method: "POST",
      headers: {},  // Let browser set multipart boundary
      body: form,
    });
  },

  // Chat
  chat: (notebookId: string, req: ChatRequest) =>
    request<ChatResponse>(`/notebooks/${notebookId}/chat`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  // Studio artifact generation
  generateArtifact: (notebookId: string, artifactType: ArtifactType, req: Record<string, unknown> = {}) => {
    const apiType = artifactType === "audio" ? "audio_overview" : artifactType;
    return request<StudioArtifact>(`/notebooks/${notebookId}/studio/${apiType}`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  // Job status polling
  getJob: (jobId: string) => request<IngestionJob>(`/jobs/${jobId}`),

  // WebSocket URL for live job progress — same daemon host/port
  getWsUrl: (notebookId?: string) => {
    const wsBase = getDaemonConnectionDetails().wsUrl;
    return notebookId
      ? `${wsBase}/notebooks/${notebookId}/jobs/ws`
      : `${wsBase}/jobs/ws`;
  },
};
