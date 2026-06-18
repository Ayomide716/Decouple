"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Download,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { api } from "@/lib/api";
import { blueprintToGraph } from "@/lib/blueprintToGraph";
import { cn, formatTokenCount } from "@/lib/utils";
import type { AnalysisJobDetail, BoundedContext, MigrationBlueprint } from "@/types/analysis";
import type { Node, Edge } from "reactflow";
import Link from "next/link";

// ── Coupling badge map ────────────────────────────────────────────────────────

const COUPLING_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  low: "success", medium: "warning", high: "destructive",
};

// ── Context panel ─────────────────────────────────────────────────────────────

function ContextPanel({
  blueprint,
  mobileOpen,
  onClose,
}: {
  blueprint: MigrationBlueprint;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const contexts = blueprint.bounded_contexts ?? [];

  const PanelBody = (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Summary bar */}
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground">Bounded Contexts</p>
        <p className="text-[11px] text-muted-foreground">
          {contexts.length} contexts · {blueprint.migration_phases?.length ?? 0} phases
        </p>
      </div>

      {/* Executive summary */}
      {blueprint.executive_summary && (
        <div className="border-b border-border bg-primary/5 px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Executive Summary
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {blueprint.executive_summary}
          </p>
        </div>
      )}

      {/* Context list */}
      <div className="flex-1 overflow-y-auto">
        {contexts.map((ctx) => (
          <button
            key={ctx.id}
            onClick={() => setSelected((s) => (s === ctx.id ? null : ctx.id))}
            className={cn(
              "w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/40",
              selected === ctx.id && "bg-muted/60"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="truncate text-xs font-semibold text-foreground">
                {ctx.name}
              </span>
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                P{ctx.migration_phase}
              </span>
            </div>

            {ctx.coupling_score && (
              <Badge
                variant={COUPLING_VARIANT[ctx.coupling_score] ?? "default"}
                className="mb-2 text-[10px]"
              >
                {ctx.coupling_score} coupling
              </Badge>
            )}

            {ctx.description && (
              <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                {ctx.description}
              </p>
            )}

            {selected === ctx.id && (
              <div className="mt-3 flex flex-col gap-3">
                {ctx.rationale && (
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Rationale
                    </p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {ctx.rationale}
                    </p>
                  </div>
                )}

                {ctx.entities && ctx.entities.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Entities
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {ctx.entities.map((e) => (
                        <span
                          key={e}
                          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {ctx.strangler_intercepts && ctx.strangler_intercepts.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Strangler Intercepts
                    </p>
                    {ctx.strangler_intercepts.map((s) => (
                      <p key={s} className="font-mono text-[10px] text-primary">{s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </button>
        ))}

        {/* Shared data risks */}
        {(blueprint.shared_data_risks ?? []).length > 0 && (
          <div className="border-t border-border">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                ⚠ Shared Data Risks
              </p>
            </div>
            {blueprint.shared_data_risks!.map((risk) => (
              <div key={risk.table_or_model} className="border-b border-border p-4">
                <p className="mb-1 font-mono text-xs font-semibold text-foreground">
                  {risk.table_or_model}
                </p>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Accessed by {risk.accessed_by.length} services
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {risk.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div
        className={cn(
          "hidden md:flex flex-col border-l border-border bg-card transition-all duration-200",
          desktopOpen ? "w-80" : "w-10"
        )}
      >
        <button
          onClick={() => setDesktopOpen((o) => !o)}
          title={desktopOpen ? "Collapse" : "Blueprint"}
          className="flex h-10 w-full items-center justify-center border-b border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <Layers className="h-4 w-4" />
        </button>
        {desktopOpen && PanelBody}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-y-0 right-0 flex w-80 max-w-[90vw] flex-col border-l border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-10 items-center justify-between border-b border-border px-4">
              <p className="text-xs font-semibold">Blueprint</p>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {PanelBody}
          </div>
        </div>
      )}
    </>
  );
}

// ── Migration phases panel ────────────────────────────────────────────────────

function PhasesDrawer({ blueprint }: { blueprint: MigrationBlueprint }) {
  const [open, setOpen] = useState(false);
  const phases = blueprint.migration_phases ?? [];
  if (!phases.length) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Phases</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
              <p className="font-semibold">Migration Phases</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {phases.map((phase) => (
                <div key={phase.phase} className="p-5">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {phase.phase}
                    </span>
                    <p className="font-semibold text-sm">{phase.title}</p>
                    {phase.shared_db_risk && phase.shared_db_risk !== "none" && (
                      <Badge variant={phase.shared_db_risk === "high" ? "destructive" : "warning"} className="text-[10px]">
                        DB risk: {phase.shared_db_risk}
                      </Badge>
                    )}
                    {phase.estimated_effort && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        ~{phase.estimated_effort}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{phase.description}</p>
                  {phase.anti_corruption_layer && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">ACL:</span>{" "}
                      {phase.anti_corruption_layer}
                    </p>
                  )}
                  {phase.strangler_intercepts?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {phase.strangler_intercepts.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BlueprintCanvasPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router    = useRouter();

  const [job, setJob]           = useState<AnalysisJobDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [panelOpen, setPanelOpen]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const detail = await api.getJobDetail(jobId);
        setJob(detail);
        if (detail.migration_blueprint) {
          const { nodes, edges } = blueprintToGraph(detail.migration_blueprint);
          setGraphNodes(nodes);
          setGraphEdges(edges);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load blueprint.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading blueprint…
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{loadError ?? "Job not found."}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/analysis">
            <ArrowLeft className="h-3.5 w-3.5" />
            New analysis
          </Link>
        </Button>
      </div>
    );
  }

  const blueprint = job.migration_blueprint;

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">

        {/* Back */}
        <Button asChild variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <Link href="/analysis">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        {/* Repo metadata */}
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="truncate font-mono text-sm font-semibold text-foreground">
            {job.repo_name}
          </span>
          <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
            {job.total_files.toLocaleString()} files ·{" "}
            {formatTokenCount(job.total_tokens)} tokens
          </span>
          {blueprint && (
            <Badge variant="success" className="hidden shrink-0 text-[10px] sm:flex">
              {blueprint.bounded_contexts?.length ?? 0} contexts
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {blueprint && <PhasesDrawer blueprint={blueprint} />}
          <Button variant="outline" size="sm" className="hidden h-7 gap-1.5 text-xs sm:flex">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setPanelOpen(true)}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas + panel */}
      <div className="flex flex-1 min-h-0">
        {graphNodes.length > 0 ? (
          <DependencyGraph
            nodes={graphNodes}
            edges={graphEdges}
            className="flex-1"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No graph data available. The blueprint may still be generating.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/canvas/${jobId}`}>Refresh</Link>
            </Button>
          </div>
        )}

        {blueprint && (
          <ContextPanel
            blueprint={blueprint}
            mobileOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
