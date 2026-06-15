"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { RepoIngestionForm } from "@/components/forms/RepoIngestionForm";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AnalysisPage() {
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a GitHub repository to extract its architecture and generate a
          Strangler Fig migration blueprint.
        </p>
      </div>

      {/* Ingestion form */}
      <Card className="shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Repository Source</CardTitle>
          <CardDescription>
            Public GitHub URLs work out of the box. For private repos, provide a
            Personal Access Token with <code className="font-mono text-xs">repo</code>{" "}
            scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepoIngestionForm onJobCompleted={setCompletedJobId} />
        </CardContent>
      </Card>

      {/* Graph canvas */}
      <Card className="flex flex-1 flex-col min-h-0">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-muted-foreground" />
            Dependency Graph
            {completedJobId ? (
              <span className="ml-auto text-xs font-normal text-emerald-400">
                Live — job {completedJobId.slice(0, 8)}
              </span>
            ) : (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Preview — mock e-commerce data
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 pb-4 px-4">
          <DependencyGraph className="rounded-md border border-border" />
        </CardContent>
      </Card>
    </div>
  );
}
