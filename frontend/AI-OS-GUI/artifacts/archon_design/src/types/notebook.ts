// Notebook Mode - TypeScript types
// Matches the FastAPI Pydantic models in daemon/notebook_routes.py

export type SourceType = "pdf" | "codebase" | "audio";

export type ArtifactType =
  | "study_guide"
  | "faq"
  | "timeline"
  | "quiz"
  | "mind_map"
  | "audio";

export type JobStatus =
  | "queued"
  | "parsing"
  | "embedding"
  | "indexed"
  | "failed";

export type SlashCommand =
  | "derive"
  | "explain"
  | "feynman"
  | "compare"
  | "list"
  | "summarize";

// Core Entities
export interface Notebook {
  notebook_id: string;
  name: string;
  created_at: number;
  sources: Source[];
}

export interface Source {
  source_id: string;
  notebook_id: string;
  title: string;
  source_type: SourceType;
  location_metadata?: Record<string, unknown>;
  ingested_at?: number;
}

// Chat
export interface Citation {
  source_id: string;
  text: string;
  page?: number | string;
  location?: string;
}

export interface NotebookChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  command?: SlashCommand;
  createdAt: number;
  isStreaming?: boolean;
}

// Ingestion Jobs
export interface IngestionJob {
  job_id: string;
  notebook_id: string;
  source_name: string;
  source_type: SourceType;
  status: JobStatus;
  progress?: number;
  error?: string;
}

// Studio Artifacts
export interface StudioArtifact {
  artifact_type: ArtifactType;
  notebook_id: string;
  content: string;
  title?: string;
  createdAt: number;
  audio_path?: string;
}

// API Requests/Responses
export interface CreateNotebookRequest { name: string; }
export interface CreateNotebookResponse { notebook_id: string; name: string; }

export interface AddSourceRequest {
  source_type: SourceType;
  file_path?: string;
  github_url?: string;
  audio_path?: string;
  metadata?: Record<string, unknown>;
}

export interface AddSourceResponse { job_id: string; status: JobStatus; }

export interface ChatRequest {
  message: string;
  command?: SlashCommand;
  model?: string;
  temperature?: number;
  top_k?: number;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  stream?: boolean;
  source_ids?: string[];
}

export interface ChatResponse { response: string; citations: Citation[]; }

export interface StudioRequest { query?: string; model?: string; }

// Slash Command descriptions shown in autocomplete
export const SLASH_COMMANDS: Record<SlashCommand, string> = {
  derive: "Step-by-step mathematical derivation with LaTeX equations",
  explain: "Detailed conceptual explanation grounded in sources",
  feynman: "Simple analogy-based explanation for any audience",
  compare: "Compare and contrast topics or documents",
  list: "Bulleted list of key facts or highlights",
  summarize: "Concise high-level summary of source context",
};
