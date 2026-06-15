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

const RECENT_JOBS = [
  {
    id: "demo",
    name: "legacy-ecommerce",
    status: "completed" as const,
    files: 247,
    tokens: "184K",
    contexts: 5,
    age: "just now",
  },
  {
    id: "2",
    name: "django-erp",
    status: "analyzing" as const,
    files: 512,
    tokens: "310K",
    contexts: null,
    age: "4m ago",
  },
  {
    id: "3",
    name: "flask-payments",
    status: "failed" as const,
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
  completed:  { label: "Completed",  variant: "success" },
  analyzing:  { label: "Analyzing…", variant: "warning" },
  failed:     { label: "Failed",     variant: "destructive" },
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered Strangler Fig migration blueprints for Python monoliths.
          </p>
        </div>
        <Button asChild>
          <Link href="/analysis">
            <Zap className="h-4 w-4" />
            New Analysis
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Analyses Run",          value: "3",   icon: FileCode2 },
          { label: "Services Identified",   value: "14",  icon: Network },
          { label: "Avg Migration Phases",  value: "4.2", icon: GitBranch },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
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

      {/* Recent analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Analyses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Repository", "Status", "Files", "Tokens", "Contexts", "Started", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
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
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {job.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {job.files > 0 ? job.files.toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      {job.tokens}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {job.contexts ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {job.age}
                    </td>
                    <td className="px-6 py-4">
                      {job.status === "completed" && (
                        <Link
                          href="/canvas"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View canvas
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Quick-start CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="font-semibold text-sm">Try the demo canvas</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore the pre-loaded legacy e-commerce dependency graph and
              Strangler Fig blueprint.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
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
