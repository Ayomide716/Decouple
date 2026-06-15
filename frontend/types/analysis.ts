export type JobStatus =
  | "pending"
  | "cloning"
  | "parsing"
  | "analyzing"
  | "completed"
  | "failed";

export interface AnalysisJob {
  id: string;
  repo_url: string | null;
  repo_name: string;
  status: JobStatus;
  error_message: string | null;
  total_files: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJobDetail extends AnalysisJob {
  file_tree: Record<string, unknown> | null;
  ast_summary: AstSummary | null;
  migration_blueprint: MigrationBlueprint | null;
}

export interface AstSummary {
  total_files: number;
  total_tokens: number;
  files: AstFileEntry[];
}

export interface AstFileEntry {
  path: string;
  token_count: number;
  language?: string;
  imports?: string[];
  functions?: AstFunction[];
  classes?: AstClass[];
  error?: string;
}

export interface AstFunction {
  name: string;
  line: number;
  args: string[];
  is_async: boolean;
  decorators: string[];
  docstring: string | null;
}

export interface AstClass {
  name: string;
  line: number;
  bases: string[];
  docstring: string | null;
}

export interface BoundedContext {
  id: string;
  name: string;
  description: string;
  entities: string[];
  exposed_apis: string[];
  inbound_dependencies: string[];
  outbound_dependencies: string[];
  migration_phase: number;
}

export interface MigrationBlueprint {
  bounded_contexts: BoundedContext[];
  migration_phases: MigrationPhase[];
}

export interface MigrationPhase {
  phase: number;
  title: string;
  description: string;
  service_name: string;
  strangler_intercepts: string[];
}

export const JOB_STATUS_STEPS: Record<
  JobStatus,
  { label: string; progress: number }
> = {
  pending: { label: "Queued", progress: 5 },
  cloning: { label: "Cloning repository…", progress: 20 },
  parsing: { label: "Parsing AST…", progress: 50 },
  analyzing: { label: "Analyzing with AI…", progress: 75 },
  completed: { label: "Analysis complete", progress: 100 },
  failed: { label: "Failed", progress: 0 },
};
