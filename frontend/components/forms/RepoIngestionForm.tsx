"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Github,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ── Simulation pipeline ───────────────────────────────────────────────────────

interface PipelineStep {
  label: string;
  duration: number; // ms
  progress: number; // 0-100
}

const PIPELINE: PipelineStep[] = [
  { label: "Cloning repository…",   duration: 1_200, progress: 15 },
  { label: "Stripping binaries…",   duration: 800,   progress: 30 },
  { label: "Walking file tree…",    duration: 700,   progress: 45 },
  { label: "Parsing AST…",          duration: 1_400, progress: 65 },
  { label: "Extracting imports…",   duration: 900,   progress: 78 },
  { label: "Building dep graph…",   duration: 800,   progress: 88 },
  { label: "Sending to Claude…",    duration: 1_500, progress: 95 },
  { label: "Blueprint generated ✓", duration: 600,   progress: 100 },
];

type FormStage = "idle" | "running" | "done" | "error";
type InputMode = "url" | "upload";

// ── Component ─────────────────────────────────────────────────────────────────

export function RepoIngestionForm() {
  const router = useRouter();
  const [mode, setMode]               = useState<InputMode>("url");
  const [repoUrl, setRepoUrl]         = useState("");
  const [dragActive, setDragActive]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [stage, setStage]             = useState<FormStage>("idle");
  const [stepIndex, setStepIndex]     = useState(0);
  const [progress, setProgress]       = useState(0);
  const [stepLabel, setStepLabel]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const runPipeline = useCallback(() => {
    setStage("running");
    setStepIndex(0);
    setProgress(0);

    let elapsed = 0;

    PIPELINE.forEach((step, i) => {
      const t = setTimeout(() => {
        setStepIndex(i);
        setStepLabel(step.label);
        setProgress(step.progress);

        if (i === PIPELINE.length - 1) {
          const done = setTimeout(() => {
            setStage("done");
            setTimeout(() => router.push("/canvas"), 900);
          }, step.duration);
          timeoutsRef.current.push(done);
        }
      }, elapsed);

      timeoutsRef.current.push(t);
      elapsed += step.duration;
    });
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasInput = mode === "url" ? repoUrl.trim() !== "" : uploadedFile !== null;
    if (!hasInput || stage === "running") return;
    clearTimeouts();
    runPipeline();
  };

  const handleReset = () => {
    clearTimeouts();
    setStage("idle");
    setRepoUrl("");
    setUploadedFile(null);
    setProgress(0);
    setStepLabel("");
    setStepIndex(0);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".zip")) {
      setUploadedFile(file);
    }
  }, []);

  const isRunning = stage === "running";
  const isDone    = stage === "done";

  return (
    <div className="flex flex-col gap-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 w-fit rounded-lg bg-muted p-1">
        {(["url", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={isRunning}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
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

      {/* Input row — hidden once running */}
      {stage === "idle" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "url" ? (
            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://github.com/org/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <Button type="submit" disabled={!repoUrl.trim()} className="shrink-0">
                Analyze
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
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadedFile(f);
                  }}
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
                      or click to browse
                    </p>
                  </>
                )}
              </div>
              {uploadedFile && (
                <Button type="submit">Upload & Analyze</Button>
              )}
            </>
          )}
        </form>
      )}

      {/* Pipeline progress card */}
      {(isRunning || isDone) && (
        <div className="rounded-lg border border-border bg-card p-5">
          {/* Repo label */}
          <div className="mb-4 flex items-center gap-2">
            <Github className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate font-mono text-sm font-semibold text-foreground">
              {mode === "url"
                ? repoUrl.replace("https://github.com/", "")
                : uploadedFile?.name}
            </span>
          </div>

          {/* Step list */}
          <ol className="mb-4 flex flex-col gap-2">
            {PIPELINE.map((step, i) => {
              const done    = i < stepIndex || isDone;
              const current = i === stepIndex && isRunning;
              const pending = i > stepIndex && !isDone;
              return (
                <li key={step.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                      done
                        ? "bg-emerald-500 text-white"
                        : current
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs transition-colors",
                      done
                        ? "text-emerald-400"
                        : current
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                    {current && (
                      <Loader2 className="ml-1.5 inline-block h-3 w-3 animate-spin align-middle" />
                    )}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Progress bar */}
          <Progress value={progress} className="mb-3 h-1" />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isDone ? (
                <span className="text-emerald-400 font-medium">
                  Redirecting to canvas…
                </span>
              ) : (
                stepLabel
              )}
            </p>
            {!isDone && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
