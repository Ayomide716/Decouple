"use client";

import { useState } from "react";
import { ChevronRight, Download, Layers, LayoutGrid, Maximize2 } from "lucide-react";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Filter pills ──────────────────────────────────────────────────────────────

const LAYER_FILTERS = [
  { id: "all",           label: "All",        color: "bg-muted text-foreground border-border" },
  { id: "apiRoute",      label: "API Routes", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  { id: "businessLogic", label: "Services",   color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { id: "database",      label: "Databases",  color: "bg-violet-500/20 text-violet-400 border-violet-500/40" },
  { id: "externalService", label: "External", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
] as const;

type FilterId = (typeof LAYER_FILTERS)[number]["id"];

// ── Bounded context panel ─────────────────────────────────────────────────────

const MOCK_CONTEXTS = [
  {
    id: "identity",
    name: "Identity & Auth",
    phase: 1,
    files: ["UserAuth.py", "auth_routes.py", "models/user.py"],
    coupling: "low" as const,
    rationale: "Zero inbound service deps. Safe to extract first.",
  },
  {
    id: "catalog",
    name: "Product Catalog",
    phase: 2,
    files: ["InventoryService.py", "inventory_routes.py", "models/product.py"],
    coupling: "medium" as const,
    rationale: "Only dependency is stock-check from OrderService — easily replaced with async event.",
  },
  {
    id: "notifications",
    name: "Notifications",
    phase: 3,
    files: ["NotificationService.py"],
    coupling: "low" as const,
    rationale: "Pure outbound. Converts to event-driven consumer trivially.",
  },
  {
    id: "payments",
    name: "Billing & Payments",
    phase: 4,
    files: ["StripeIntegration.py", "payment_routes.py"],
    coupling: "medium" as const,
    rationale: "Shared Transaction table is the main risk — needs ownership transfer.",
  },
  {
    id: "orders",
    name: "Order Management",
    phase: 5,
    files: ["OrderService.py", "order_routes.py", "models/order.py"],
    coupling: "high" as const,
    rationale: "Core domain — extract last once all dependencies are decoupled.",
  },
];

const COUPLING_BADGE: Record<"low" | "medium" | "high", "success" | "warning" | "destructive"> = {
  low: "success", medium: "warning", high: "destructive",
};

function ContextPanel({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(true);

  const content = (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground">Bounded Contexts</p>
        <p className="text-[11px] text-muted-foreground">5 contexts · 5 migration phases</p>
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
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="truncate text-xs font-semibold text-foreground">{ctx.name}</span>
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                P{ctx.phase}
              </span>
            </div>
            <Badge variant={COUPLING_BADGE[ctx.coupling]} className="text-[10px]">
              {ctx.coupling} coupling
            </Badge>
            {selected === ctx.id && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">{ctx.rationale}</p>
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Files
                  </p>
                  {ctx.files.map((f) => (
                    <p key={f} className="font-mono text-[10px] text-foreground">{f}</p>
                  ))}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-border p-4">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Executive Summary
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The monolith contains 5 distinct business domains. Extracting Identity first (Phase 1)
          de-risks auth changes and validates the Strangler Fig proxy before touching the core
          Order domain.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop collapsible panel */}
      <div
        className={cn(
          "hidden md:flex flex-col border-l border-border bg-card transition-all duration-200",
          desktopOpen ? "w-72" : "w-10"
        )}
      >
        <button
          onClick={() => setDesktopOpen((o) => !o)}
          title={desktopOpen ? "Collapse" : "Bounded Contexts"}
          className="flex h-10 w-full items-center justify-center border-b border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <Layers className="h-4 w-4" />
        </button>
        {desktopOpen && content}
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
              <p className="text-xs font-semibold">Bounded Contexts</p>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [panelOpen, setPanelOpen]       = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">

        {/* Filter pills — scroll on mobile */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {LAYER_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                activeFilter === f.id
                  ? f.color
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Repo metadata — hidden on xs */}
          <span className="hidden text-[11px] text-muted-foreground lg:block">
            legacy-ecommerce · 247 files · 184K tokens
          </span>

          {/* Desktop buttons */}
          <Button variant="outline" size="sm" className="hidden h-7 gap-1.5 text-xs sm:flex">
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Auto-layout</span>
          </Button>
          <Button variant="outline" size="sm" className="hidden h-7 gap-1.5 text-xs sm:flex">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Fullscreen icon */}
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>

          {/* Mobile: open context panel */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden"
            onClick={() => setPanelOpen(true)}
            title="Bounded Contexts"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas + panel */}
      <div className="flex flex-1 min-h-0">
        <DependencyGraph className="flex-1" />
        <ContextPanel mobileOpen={panelOpen} onClose={() => setPanelOpen(false)} />
      </div>

    </div>
  );
}
