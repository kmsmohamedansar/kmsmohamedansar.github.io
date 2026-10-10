import type { ExtractResult } from "../recipes/types";

export type JobStatus = "queued" | "running" | "done" | "failed" | "stopped";

export interface Job {
  id: string;
  symbol: string;
  url: string;
  status: JobStatus;
  stage?: string;
  result?: ExtractResult;
  error?: string;
  hint?: string;
}
