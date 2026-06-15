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

const MOCK_RECENT_JOBS = [
  {
    id: "1a2b",
    name: "spring-petclinic",
    status: "completed" as const,
    files: 128,
    tokens: "84.2K",
    age: "2h ago",
  },
  {
    id: "3c4d",
    name: "django-oscar",
    status: "analyzing" as const,
    files: 342,
    tokens: "210K",
    age: "11m ago",
  },
  {
    id: "5e6f",
    name: "shopware",
    status: "failed" as const,
    files: 0,
    tokens: "—",
    age: "1d ago",
  },
];

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "default" | "warning" | "destructive" }
> = {
  completed: { label: "Completed", variant: "success" },
  analyzing: { label: "Analyzing…", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  pending: { label: "Queued", variant: "secondary" as "default" },
  cloning: { label: "Cloning", variant: "default" },
  parsing: { label: "Parsing", variant: "default" },
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reverse-engineer your monolith. Generate a Strangler Fig blueprint.
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
          { label: "Total Analyses", value: "3", icon: FileCode2 },
          { label: "Services Identified", value: "14", icon: Network },
          { label: "Avg. Migration Phases", value: "4.2", icon: GitBranch },
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
                {["Repository", "Status", "Files", "Tokens", "Started", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {MOCK_RECENT_JOBS.map((job) => {
                const badge = STATUS_BADGE[job.status];
                return (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-foreground">
                      {job.name}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {job.files > 0 ? job.files.toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {job.tokens}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{job.age}</td>
                    <td className="px-6 py-4">
                      {job.status === "completed" && (
                        <Link
                          href={`/analysis/${job.id}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View blueprint
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
    </div>
  );
}
