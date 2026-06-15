"use client";

import { useState } from "react";
import {
  Download,
  Filter,
  Layers,
  LayoutGrid,
  Maximize2,
} from "lucide-react";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Filter pill types ─────────────────────────────────────────────────────────

const LAYER_FILTERS = [
  { id: "all",      label: "All",              color: "bg-muted text-foreground" },
  { id: "apiRoute", label: "API Routes",        color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "businessLogic", label: "Services",     color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { id: "database", label: "Databases",         color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { id: "externalService", label: "External",   color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
] as const;

type FilterId = (typeof LAYER_FILTERS)[number]["id"];

// ── Bounded context sidebar panel ─────────────────────────────────────────────

const MOCK_CONTEXTS = [
  {
    id: "identity",
    name: "Identity & Auth",
    phase: 1,
    files: ["UserAuth.py", "auth_routes.py", "models/user.py"],
    coupling: "low",
    rationale: "Zero inbound service deps. Safe to extract first.",
  },
  {
    id: "catalog",
    name: "Product Catalog",
    phase: 2,
    files: ["InventoryService.py", "inventory_routes.py", "models/product.py"],
    coupling: "medium",
    rationale: "Only dependency is stock-check from OrderService — easily replaced with async event.",
  },
  {
    id: "notifications",
    name: "Notifications",
    phase: 3,
    files: ["NotificationService.py"],
    coupling: "low",
    rationale: "Pure outbound. Converts to event-driven consumer trivially.",
  },
  {
    id: "payments",
    name: "Billing & Payments",
    phase: 4,
    files: ["StripeIntegration.py", "payment_routes.py"],
    coupling: "medium",
    rationale: "Shared Transaction table is the main risk — needs ownership transfer.",
  },
  {
    id: "orders",
    name: "Order Management",
    phase: 5,
    files: ["OrderService.py", "order_routes.py", "models/order.py"],
    coupling: "high",
    rationale: "Core domain — extract last once all dependencies are decoupled.",
  },
];

const COUPLING_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
};

function ContextPanel() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "flex flex-col border-l border-border bg-card transition-all duration-300",
        open ? "w-72" : "w-10"
      )}
    >
      {/* Toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-center border-b border-border text-muted-foreground hover:text-foreground transition-colors"
        title={open ? "Collapse panel" : "Bounded Contexts"}
      >
        <Layers className="h-4 w-4" />
      </button>

      {open && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold text-foreground">
              Bounded Contexts
            </p>
            <p className="text-[11px] text-muted-foreground">
              5 contexts · 5 migration phases
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {MOCK_CONTEXTS.map((ctx) => (
              <button
                key={ctx.id}
                onClick={() => setSelected((s) => (s === ctx.id ? null : ctx.id))}
                className={cn(
                  "w-full border-b border-border p-4 text-left transition-colors hover:bg-muted/40",
                  selected === ctx.id && "bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {ctx.name}
                  </span>
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    P{ctx.phase}
                  </span>
                </div>

                <Badge variant={COUPLING_BADGE[ctx.coupling]} className="mb-2 text-[10px]">
                  {ctx.coupling} coupling
                </Badge>

                {selected === ctx.id && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {ctx.rationale}
                    </p>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Files
                      </p>
                      {ctx.files.map((f) => (
                        <p key={f} className="font-mono text-[10px] text-foreground">
                          {f}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Executive summary footer */}
          <div className="border-t border-border p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Executive Summary
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The monolith contains 5 distinct business domains. Extracting
              Identity first (Phase 1) de-risks auth changes and validates the
              Strangler Fig proxy before touching the core Order domain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-2">Filter:</span>
          {LAYER_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                activeFilter === f.id
                  ? f.color + " border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            legacy-ecommerce  ·  247 files  ·  184 K tokens
          </span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <LayoutGrid className="h-3.5 w-3.5" />
            Auto-layout
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export SVG
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas + side panel */}
      <div className="flex flex-1 min-h-0">
        <DependencyGraph className="flex-1" />
        <ContextPanel />
      </div>
    </div>
  );
}
