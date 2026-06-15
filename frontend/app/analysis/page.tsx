import { Zap } from "lucide-react";
import { RepoIngestionForm } from "@/components/forms/RepoIngestionForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalysisPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a GitHub repository URL or upload a ZIP archive. Decouple will
          parse the AST, map dependencies, and generate your Strangler Fig
          blueprint.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            step: "01",
            title: "Ingest",
            body: "Clone & filter the repo — strips binaries, lock files, and node_modules.",
          },
          {
            step: "02",
            title: "Parse",
            body: "Walk every Python file, extract classes, functions, and the full import graph.",
          },
          {
            step: "03",
            title: "Architect",
            body: "Claude identifies Bounded Contexts and generates your phased migration plan.",
          },
        ].map(({ step, title, body }) => (
          <div
            key={step}
            className="rounded-lg border border-border bg-card p-4"
          >
            <span className="font-mono text-xs font-bold text-primary">
              {step}
            </span>
            <p className="mt-1 font-semibold text-sm">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Repository Source
          </CardTitle>
          <CardDescription>
            Public repos work out of the box. For private repos, paste a
            Personal Access Token in the URL:{" "}
            <code className="font-mono text-xs">
              https://TOKEN@github.com/org/repo
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RepoIngestionForm />
        </CardContent>
      </Card>
    </div>
  );
}
