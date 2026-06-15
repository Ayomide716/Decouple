"use client";

import { useCallback, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { DatabaseNode, ApiRouteNode, BusinessLogicNode, ExternalServiceNode, nodeTypes } from "./nodeTypes";
import { MOCK_NODES, MOCK_EDGES } from "./mockData";
import { cn } from "@/lib/utils";

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { color: "bg-blue-500", label: "API Route" },
  { color: "bg-amber-500", label: "Business Logic" },
  { color: "bg-violet-500", label: "Database / Schema" },
  { color: "bg-emerald-500", label: "External Service" },
];

const EDGE_LEGEND = [
  { dash: false, color: "border-border", label: "Direct call" },
  { dash: true, color: "border-amber-500", label: "Cross-service dependency" },
  { dash: false, color: "border-red-500", label: "Shared data (anti-pattern)" },
];

function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-xs shadow-md">
      <p className="font-semibold text-foreground">Node Types</p>
      {LEGEND_ITEMS.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-sm", color)} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
      <div className="my-1 border-t border-border" />
      <p className="font-semibold text-foreground">Edge Types</p>
      {EDGE_LEGEND.map(({ dash, color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={cn(
              "h-0 w-6 border-t-2",
              color,
              dash && "border-dashed"
            )}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  onClose,
}: {
  node: Node;
  onClose: () => void;
}) {
  const data = node.data as {
    label: string;
    sublabel?: string;
    metrics?: { label: string; value: string }[];
  };

  return (
    <div className="absolute right-4 top-4 z-10 w-64 rounded-lg border border-border bg-card p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-sm">{data.label}</p>
          {data.sublabel && (
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {data.sublabel}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs shrink-0"
        >
          ✕
        </button>
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        Type:{" "}
        <span className="text-foreground font-medium capitalize">
          {node.type?.replace(/([A-Z])/g, " $1").trim()}
        </span>
      </div>
      {data.metrics && (
        <div className="flex flex-col gap-2">
          {data.metrics.map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5"
            >
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-mono font-semibold text-foreground">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DependencyGraphProps {
  nodes?: Node[];
  edges?: Edge[];
  className?: string;
}

export function DependencyGraph({
  nodes: externalNodes,
  edges: externalEdges,
  className,
}: DependencyGraphProps) {
  const [nodes, , onNodesChange] = useNodesState(externalNodes ?? MOCK_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(externalEdges ?? MOCK_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={cn("relative h-full w-full rounded-lg overflow-hidden", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--border))"
        />
        <Controls position="top-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(n) => {
            switch (n.type) {
              case "database": return "hsl(258 90% 66%)";
              case "apiRoute": return "hsl(217 91% 60%)";
              case "businessLogic": return "hsl(38 92% 50%)";
              case "externalService": return "hsl(160 84% 39%)";
              default: return "hsl(var(--muted-foreground))";
            }
          }}
          maskColor="hsl(var(--muted) / 0.7)"
        />
      </ReactFlow>

      <Legend />

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
