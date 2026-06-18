/**
 * Typed API client — all calls go through Next.js /api/* rewrite → FastAPI.
 * No direct backend URLs in component code.
 */

import type {
  AnalysisJob,
  BlueprintStatusResponse,
  AnalysisJobDetail,
} from "@/types/analysis";

const BASE = "/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? message;
    } catch {
      // ignore parse error, use status text
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Analysis jobs ─────────────────────────────────────────────────────────────

export const api = {
  /** Submit a repo URL for analysis. Returns immediately with PENDING job. */
  createJob(repoUrl: string, githubToken?: string): Promise<AnalysisJob> {
    return apiFetch("/analysis/", {
      method: "POST",
      body: JSON.stringify({
        repo_url: repoUrl,
        github_token: githubToken ?? null,
      }),
    });
  },

  /** Lightweight status poll — progress %, blueprint preview. */
  getJobStatus(jobId: string): Promise<BlueprintStatusResponse> {
    return apiFetch(`/analysis/${jobId}/status`);
  },

  /** Full detail including raw AST + complete blueprint JSON. */
  getJobDetail(jobId: string): Promise<AnalysisJobDetail> {
    return apiFetch(`/analysis/${jobId}`);
  },

  /** List recent jobs, newest first. */
  listJobs(limit = 20): Promise<AnalysisJob[]> {
    return apiFetch(`/analysis/?limit=${limit}`);
  },
};
