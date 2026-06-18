import Link from "next/link";
import {
  ArrowRight,
  Clock,
  FileCode2,
  GitBranch,
  Network,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MockJob {
  id: string;
  name: string;
  status: "completed" | "analyzing" | "failed";
  files: number;
  tokens: string;
  contexts: number | null;
  age: string;
}

const RECENT_JOBS: MockJob[] = [
  {
    id: "demo",
    name: "legacy-ecommerce",
    status: "completed",
    files: 247,
    tokens: "184K",
    contexts: 5,
    age: "just now",
  },
  {
    id: "2",
    name: "django-erp",
    status: "analyzing",
    files: 512,
    tokens: "310K",
    contexts: null,
    age: "4m ago",
  },
  {
    id: "3",
    name: "flask-payments",
    status: "failed",
    files: 0,
    tokens: "—",
    contexts: null,
    age: "2h ago",
  },
] as const;

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "default" | "warning" | "destructive" }
> = {
  completed: { label: "Completed",  variant: "success" },
  analyzing: { label: "Analyzing…", variant: "warning" },
  failed:    { label: "Failed",     variant: "destructive" },
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered Strangler Fig migration blueprints for Python monoliths.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/analysis">
            <Zap className="h-4 w-4" />
            New Analysis
          </Link>
        </Button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Analyses Run",         value: "3",   icon: FileCode2 },
          { label: "Services Identified",  value: "14",  icon: Network },
          { label: "Avg Migration Phases", value: "4.2", icon: GitBranch },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Recent analyses ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Repository", "Status", "Files", "Tokens", "Contexts", "Started", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_JOBS.map((job) => {
                  const badge = STATUS_BADGE[job.status];
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-foreground">{job.name}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {job.files > 0 ? job.files.toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{job.tokens}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{job.contexts ?? "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{job.age}</td>
                      <td className="px-5 py-3.5">
                        {job.status === "completed" && (
                          <Link
                            href={job.id === "demo" ? "/canvas" : `/canvas/${job.id}`}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View canvas <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col divide-y divide-border sm:hidden">
            {RECENT_JOBS.map((job) => {
              const badge = STATUS_BADGE[job.status];
              return (
                <div key={job.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-medium text-foreground">
                      {job.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">{job.age}</span>
                    </div>
                    {job.files > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.files.toLocaleString()} files · {job.tokens} tokens
                        {job.contexts ? ` · ${job.contexts} contexts` : ""}
                      </p>
                    )}
                  </div>
                  {job.status === "completed" && (
                    <Link
                      href={job.id === "demo" ? "/canvas" : `/canvas/${job.id}`}
                      className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                    >
                      Canvas <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="font-semibold text-sm">Try the demo canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore the pre-loaded legacy e-commerce dependency graph and Strangler Fig blueprint.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
            <Link href="/canvas">
              <Network className="h-3.5 w-3.5" />
              Open Canvas
            </Link>
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
