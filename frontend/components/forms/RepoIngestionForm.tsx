"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, extractRepoName, formatTokenCount } from "@/lib/utils";
import { useJobPoller } from "@/hooks/useJobPoller";
import type { AnalysisJob } from "@/types/analysis";
import { JOB_STATUS_STEPS } from "@/types/analysis";

interface RepoIngestionFormProps {
  onJobCompleted?: (jobId: string) => void;
}

type InputMode = "url" | "upload";

export function RepoIngestionForm({ onJobCompleted }: RepoIngestionFormProps) {
  const [mode, setMode] = useState<InputMode>("url");
  const [repoUrl, setRepoUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedJob, setSubmittedJob] = useState<AnalysisJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { job, isPolling, error: pollError, startPolling } = useJobPoller();

  const activeJob = job ?? submittedJob;

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) {
      setUploadedFile(file);
    } else {
      toast.error("Only .zip archives are supported.");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "url" && !repoUrl.trim()) return;
    if (mode === "upload" && !uploadedFile) return;

    setSubmitting(true);

    try {
      // URL mode: POST to the real API endpoint
      if (mode === "url") {
        const res = await fetch("/api/v1/analysis/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_url: repoUrl.trim() }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail ?? `HTTP ${res.status}`);
        }

        const created: AnalysisJob = await res.json();
        setSubmittedJob(created);
        startPolling(created.id);
        toast.success("Analysis queued", {
          description: extractRepoName(repoUrl),
        });
      } else {
        // Upload mode: simulate submission (Phase 2 will add multipart endpoint)
        await new Promise((r) => setTimeout(r, 1_200));
        toast.info("ZIP upload will be available in the next release.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start analysis"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRepoUrl("");
    setUploadedFile(null);
    setSubmittedJob(null);
  };

  const statusStep = activeJob
    ? JOB_STATUS_STEPS[activeJob.status]
    : null;

  const isTerminal =
    activeJob?.status === "completed" || activeJob?.status === "failed";

  if (isTerminal && activeJob?.status === "completed" && onJobCompleted) {
    onJobCompleted(activeJob.id);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["url", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "url" ? (
              <Github className="h-3.5 w-3.5" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {m === "url" ? "GitHub URL" : "Upload ZIP"}
          </button>
        ))}
      </div>

      {/* Input area */}
      {!activeJob && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "url" ? (
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://github.com/org/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="font-mono text-sm"
                disabled={submitting}
              />
              <Button
                type="submit"
                disabled={!repoUrl.trim() || submitting}
                className="shrink-0"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          ) : (
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
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
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a{" "}
                    <span className="font-mono text-foreground">.zip</span>{" "}
                    archive or click to browse
                  </p>
                </>
              )}
            </div>
          )}

          {mode === "upload" && uploadedFile && (
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Upload & Analyze"
              )}
            </Button>
          )}
        </form>
      )}

      {/* Progress card */}
      {activeJob && statusStep && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <p className="truncate font-mono text-sm font-semibold">
                    {activeJob.repo_name}
                  </p>
                  <Badge
                    variant={
                      activeJob.status === "completed"
                        ? "success"
                        : activeJob.status === "failed"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {statusStep.label}
                  </Badge>
                </div>

                {activeJob.status !== "failed" && (
                  <Progress
                    value={statusStep.progress}
                    className="mb-3"
                  />
                )}

                {activeJob.status === "failed" && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {activeJob.error_message ?? "An unexpected error occurred."}
                  </div>
                )}

                {activeJob.status === "completed" && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">
                        {activeJob.total_files.toLocaleString()}
                      </span>{" "}
                      files
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">
                        {formatTokenCount(activeJob.total_tokens)}
                      </span>{" "}
                      tokens
                    </span>
                  </div>
                )}
              </div>

              {isTerminal && (
                <button
                  onClick={handleReset}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {isPolling && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Polling for updates…
              </div>
            )}

            {pollError && (
              <p className="mt-2 text-xs text-destructive">{pollError}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
