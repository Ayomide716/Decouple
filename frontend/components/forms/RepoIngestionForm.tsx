"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn, formatTokenCount } from "@/lib/utils";
import { api } from "@/lib/api";
import { useJobPoller } from "@/hooks/useJobPoller";
import { JOB_STATUS_STEPS } from "@/types/analysis";

type InputMode = "url" | "upload";

export function RepoIngestionForm() {
  const router = useRouter();
  const [mode, setMode]                 = useState<InputMode>("url");
  const [repoUrl, setRepoUrl]           = useState("");
  const [dragActive, setDragActive]     = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [jobId, setJobId]               = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { status, isPolling, error: pollError, startPolling, stopPolling } =
    useJobPoller();

  // Navigate to canvas once the blueprint is ready
  if (status?.status === "completed" && jobId) {
    router.push(`/canvas/${jobId}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "url" && !repoUrl.trim()) return;
    if (mode === "upload" && !uploadedFile) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const job = await api.createJob(repoUrl.trim());
      setJobId(job.id);
      startPolling(job.id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to start analysis."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setJobId(null);
    setRepoUrl("");
    setUploadedFile(null);
    setSubmitError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) setUploadedFile(file);
  }, []);

  const isRunning = !!jobId && status?.status !== "completed" && status?.status !== "failed";
  const isFailed  = status?.status === "failed";
  const step      = status ? JOB_STATUS_STEPS[status.status] : null;

  return (
    <div className="flex flex-col gap-5">

      {/* Mode toggle */}
      <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {(["url", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={isRunning || submitting}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "url" ? <Github className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {m === "url" ? "GitHub URL" : "Upload ZIP"}
          </button>
        ))}
      </div>

      {/* Input — shown when idle */}
      {!jobId && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "url" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                placeholder="https://github.com/org/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={submitting}
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                disabled={!repoUrl.trim() || submitting}
                className="w-full shrink-0 sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          ) : (
            <>
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); }}
                />
                {uploadedFile ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1_048_576).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-center text-sm text-muted-foreground">
                      Drag & drop a{" "}
                      <span className="font-mono text-foreground">.zip</span>{" "}
                      or click to browse
                    </p>
                  </>
                )}
              </div>
              {uploadedFile && (
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload & Analyze"}
                </Button>
              )}
            </>
          )}

          {/* Submission error */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {submitError}
            </div>
          )}
        </form>
      )}

      {/* Live progress card */}
      {jobId && status && step && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 sm:p-5">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-sm font-semibold text-foreground">
                {status.repo_name}
              </span>
            </div>
            {(isFailed || status.status === "completed") && (
              <button
                onClick={handleReset}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {!isFailed && (
            <Progress value={status.progress} className="mb-4 h-1" />
          )}

          {/* Status label */}
          <p className="mb-3 text-xs font-medium text-foreground">{step.label}</p>

          {/* Stats row — shown once parsing begins */}
          {status.total_files > 0 && (
            <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">
                  {status.total_files.toLocaleString()}
                </span>{" "}
                files
              </span>
              <span>
                <span className="font-semibold text-foreground">
                  {formatTokenCount(status.total_tokens)}
                </span>{" "}
                tokens
              </span>
            </div>
          )}

          {/* Blueprint preview — shown while analyzing/completed */}
          {status.blueprint_preview && (
            <div className="rounded-md border border-border bg-card p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Blueprint Preview
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span>
                  <span className="font-semibold text-foreground">
                    {status.blueprint_preview.bounded_contexts_count}
                  </span>{" "}
                  bounded contexts
                </span>
                <span>
                  <span className="font-semibold text-foreground">
                    {status.blueprint_preview.migration_phases_count}
                  </span>{" "}
                  migration phases
                </span>
                {status.blueprint_preview.shared_data_risks_count > 0 && (
                  <span className="text-amber-400">
                    ⚠ {status.blueprint_preview.shared_data_risks_count} shared data risks
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {isFailed && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {status.error_message ?? "Analysis failed. Please try again."}
            </div>
          )}

          {/* Polling indicator */}
          {isPolling && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking for updates…
            </div>
          )}

          {pollError && (
            <p className="mt-2 text-xs text-destructive">{pollError}</p>
          )}
        </div>
      )}
    </div>
  );
}
