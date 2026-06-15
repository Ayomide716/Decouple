import { redirect } from "next/navigation";

// Blueprints moved to /canvas
export default function BlueprintsPage() {
  redirect("/canvas");
}
