import { Construction } from "lucide-react";

export default function BlueprintsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Blueprints</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Completed migration blueprints will appear here. Run an analysis first
        to generate your Strangler Fig plan.
      </p>
    </div>
  );
}
