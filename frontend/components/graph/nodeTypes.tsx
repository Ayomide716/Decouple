"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  Database,
  Globe,
  Box,
  Mail,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared shell ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  Globe,
  Box,
  Mail,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
};

interface BaseNodeData {
  label: string;
  sublabel?: string;
  icon?: string;
  metrics?: { label: string; value: string }[];
  isExtracted?: boolean;
}

function NodeShell({
  data,
  accentClass,
  iconBgClass,
  selected,
  children,
}: {
  data: BaseNodeData;
  accentClass: string;
  iconBgClass: string;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const IconComponent = data.icon ? ICON_MAP[data.icon] ?? Box : Box;

  return (
    <div
      className={cn(
        "relative min-w-[180px] rounded-lg border bg-card shadow-md transition-shadow",
        selected ? "border-primary shadow-lg shadow-primary/10" : "border-border",
        data.isExtracted && "opacity-60"
      )}
    >
      {/* Top accent bar */}
      <div className={cn("h-0.5 w-full rounded-t-lg", accentClass)} />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              iconBgClass
            )}
          >
            <IconComponent className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight text-foreground">
              {data.label}
            </p>
            {data.sublabel && (
              <p className="truncate text-[10px] text-muted-foreground leading-tight">
                {data.sublabel}
              </p>
            )}
          </div>
        </div>

        {/* Metrics */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-2 mt-1">
            {data.metrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                <span className="text-[10px] font-mono font-medium text-foreground">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {children}
      </div>

      {data.isExtracted && (
        <div className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
          EXTRACTED
        </div>
      )}
    </div>
  );
}

// ── Node types ────────────────────────────────────────────────────────────────

export const DatabaseNode = memo(({ data, selected }: NodeProps<BaseNodeData>) => (
  <>
    <Handle type="target" position={Position.Top} />
    <NodeShell
      data={data}
      accentClass="bg-violet-500"
      iconBgClass="bg-violet-500/15 text-violet-400"
      selected={selected}
    />
    <Handle type="source" position={Position.Bottom} />
  </>
));
DatabaseNode.displayName = "DatabaseNode";

export const ApiRouteNode = memo(({ data, selected }: NodeProps<BaseNodeData>) => (
  <>
    <Handle type="target" position={Position.Top} />
    <NodeShell
      data={data}
      accentClass="bg-blue-500"
      iconBgClass="bg-blue-500/15 text-blue-400"
      selected={selected}
    />
    <Handle type="source" position={Position.Bottom} />
  </>
));
ApiRouteNode.displayName = "ApiRouteNode";

export const BusinessLogicNode = memo(
  ({ data, selected }: NodeProps<BaseNodeData>) => (
    <>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        data={data}
        accentClass="bg-amber-500"
        iconBgClass="bg-amber-500/15 text-amber-400"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  )
);
BusinessLogicNode.displayName = "BusinessLogicNode";

export const ExternalServiceNode = memo(
  ({ data, selected }: NodeProps<BaseNodeData>) => (
    <>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        data={data}
        accentClass="bg-emerald-500"
        iconBgClass="bg-emerald-500/15 text-emerald-400"
        selected={selected}
      />
      <Handle type="source" position={Position.Bottom} />
    </>
  )
);
ExternalServiceNode.displayName = "ExternalServiceNode";

export const nodeTypes = {
  database: DatabaseNode,
  apiRoute: ApiRouteNode,
  businessLogic: BusinessLogicNode,
  externalService: ExternalServiceNode,
};
