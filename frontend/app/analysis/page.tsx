import { Zap } from "lucide-react";
import { RepoIngestionForm } from "@/components/forms/RepoIngestionForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STEPS = [
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
];

export default function AnalysisPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          New Analysis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a GitHub repository URL or upload a ZIP archive. Decouple will
          parse the AST, map dependencies, and generate your Strangler Fig blueprint.
        </p>
      </div>

      {/* ── 3-step explainer ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {STEPS.map(({ step, title, body }) => (
          <div
            key={step}
            className="relative overflow-hidden rounded-lg border border-border bg-card p-4"
          >
            {/* subtle background number */}
            <span className="absolute right-3 top-1 select-none font-mono text-4xl font-black text-muted/30">
              {step}
            </span>
            <span className="font-mono text-xs font-bold text-primary">{step}</span>
            <p className="mt-1 font-semibold text-sm">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <Card className="max-w-2xl w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" />
            Repository Source
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Public repos work out of the box. For private repos, paste a Personal
            Access Token in the URL:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
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
