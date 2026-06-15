import { Construction } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        API keys, workspace preferences, and team management coming soon.
      </p>
    </div>
  );
}
