/**
 * Converts a MigrationBlueprint from the API into React Flow nodes + edges.
 *
 * Layout strategy: simple auto-grid in rows of 4, top-to-bottom by phase.
 * Each BoundedContext becomes a businessLogic node; its inbound/outbound
 * dependencies become edges.  Shared data risks get a database node per
 * unique table.
 */

import type { Node, Edge } from "reactflow";
import type { MigrationBlueprint, BoundedContext } from "@/types/analysis";

const COL_WIDTH  = 220;
const ROW_HEIGHT = 180;
const COLS       = 4;

function phaseColor(coupling: string | undefined): string {
  switch (coupling) {
    case "low":    return "businessLogic";
    case "high":   return "businessLogic";
    default:       return "businessLogic";
  }
}

function couplingMetric(c: BoundedContext) {
  return [
    { label: "Migration phase", value: `Phase ${c.migration_phase}` },
    ...(c.coupling_score ? [{ label: "Coupling", value: c.coupling_score.toUpperCase() }] : []),
    { label: "APIs owned", value: String(c.exposed_apis?.length ?? 0) },
    { label: "Entities", value: String(c.entities?.length ?? 0) },
  ];
}

export function blueprintToGraph(blueprint: MigrationBlueprint): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // ── Sort contexts by migration phase so phase 1 is top-left ──────────────
  const sorted = [...(blueprint.bounded_contexts ?? [])].sort(
    (a, b) => (a.migration_phase ?? 99) - (b.migration_phase ?? 99)
  );

  // ── Context nodes ─────────────────────────────────────────────────────────
  sorted.forEach((ctx, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    nodes.push({
      id: ctx.id,
      type: "businessLogic",
      position: { x: col * COL_WIDTH, y: row * ROW_HEIGHT },
      data: {
        label: ctx.name,
        sublabel: ctx.description?.slice(0, 60) + (ctx.description?.length > 60 ? "…" : ""),
        icon: "Box",
        metrics: couplingMetric(ctx),
      },
    });
  });

  // ── Dependency edges ──────────────────────────────────────────────────────
  sorted.forEach((ctx) => {
    (ctx.outbound_dependencies ?? []).forEach((targetId, idx) => {
      // Only draw if both sides exist in the context list
      const targetExists = sorted.some((c) => c.id === targetId);
      if (!targetExists) return;

      edges.push({
        id: `e-${ctx.id}-${targetId}-${idx}`,
        source: ctx.id,
        target: targetId,
        label: "calls",
        style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "5 4" },
        labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "hsl(222 47% 8%)", fillOpacity: 0.85 },
      });
    });
  });

  // ── Shared data risk nodes ─────────────────────────────────────────────────
  const dbNodeIds = new Set<string>();
  (blueprint.shared_data_risks ?? []).forEach((risk, i) => {
    const dbId = `db-${risk.table_or_model.replace(/\s+/g, "-").toLowerCase()}`;
    if (!dbNodeIds.has(dbId)) {
      dbNodeIds.add(dbId);
      const col = i % COLS;
      const row = Math.floor(sorted.length / COLS) + 1 + Math.floor(i / COLS);
      nodes.push({
        id: dbId,
        type: "database",
        position: { x: col * COL_WIDTH, y: row * ROW_HEIGHT },
        data: {
          label: risk.table_or_model,
          sublabel: `Shared by ${risk.accessed_by.length} contexts`,
          icon: "Database",
          metrics: [
            { label: "Accessed by", value: String(risk.accessed_by.length) },
            { label: "Risk", value: "HIGH" },
          ],
        },
      });
    }

    // Red edges from each owner to the shared table
    risk.accessed_by.forEach((ctxId) => {
      edges.push({
        id: `e-shared-${ctxId}-${dbId}`,
        source: ctxId,
        target: dbId,
        style: { stroke: "hsl(0 72% 51%)", strokeWidth: 2 },
      });
    });
  });

  return { nodes, edges };
}
