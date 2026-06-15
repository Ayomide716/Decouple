"""
ClaudeArchitect — multi-pass LLM analysis engine.

Pass 1 (schema pass)  — identify data models, DB entities, key constraints
Pass 2 (graph pass)   — map service boundaries from the dependency graph
Pass 3 (context pass) — define Bounded Contexts using DDD principles
Pass 4 (blueprint)    — generate the phased Strangler Fig migration plan

Each pass feeds its compact JSON output into the next, keeping
the context window focused rather than blasting the full AST every time.
Prompt caching (cache_control) is applied to the static system prompt +
Pass 1 output so repeated analysis iterations are cheap.
"""

import json
from typing import Any

import anthropic
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import get_settings
from app.services.analyzer import RepositoryAST, ASTAnalyzer

log = structlog.get_logger(__name__)
settings = get_settings()

# ── JSON schema for the final blueprint ──────────────────────────────────────

BLUEPRINT_SCHEMA = {
    "bounded_contexts": [
        {
            "id": "string — snake_case identifier",
            "name": "string — human-readable name",
            "description": "string — what this service is responsible for",
            "entities": ["list of class/model names that belong here"],
            "exposed_apis": ["list of route paths / function signatures this service owns"],
            "inbound_dependencies": ["context ids this service RECEIVES data from"],
            "outbound_dependencies": ["context ids this service CALLS"],
            "migration_phase": "integer — 1 = extract first (fewest inbound deps)",
            "strangler_intercepts": ["HTTP paths or event names the proxy must intercept"],
            "coupling_score": "low | medium | high",
            "rationale": "string — why these files belong together",
        }
    ],
    "migration_phases": [
        {
            "phase": "integer",
            "title": "string",
            "description": "string — what changes in this phase",
            "service_name": "string — name of the microservice to extract",
            "anti_corruption_layer": "string — what the strangler proxy must translate",
            "shared_db_risk": "none | low | high",
            "estimated_effort": "days — rough estimate",
        }
    ],
    "shared_data_risks": [
        {
            "table_or_model": "string",
            "accessed_by": ["context ids that touch this model"],
            "recommendation": "string — how to resolve the shared ownership",
        }
    ],
    "executive_summary": "string — 3-4 sentences for a non-technical stakeholder",
}

# ── System prompt (cached across all passes) ─────────────────────────────────

SYSTEM_PROMPT = f"""You are a Principal Software Architect specialising in Domain-Driven Design (DDD),
microservices decomposition, and the Strangler Fig migration pattern.

Your task is to analyse a Python monolithic codebase — provided as structured AST metadata —
and produce a rigorous, actionable migration blueprint.

Principles you MUST apply:
1. Bounded Contexts: Group files by the business capability they implement, NOT by technical layer.
2. Strangler Fig: Each extracted service must be deployable behind a proxy without touching the monolith.
3. Dependency order: Services with zero inbound internal dependencies should be extracted first (Phase 1).
4. Shared data: Explicitly call out tables/models accessed by more than one bounded context.
5. Anti-corruption layers: Identify the HTTP routes or event bus topics the proxy must intercept.

Output format: You MUST respond with ONLY valid JSON matching this exact schema (no prose, no markdown fences):
{json.dumps(BLUEPRINT_SCHEMA, indent=2)}"""


class AnalysisPassError(Exception):
    """Raised when a Claude API pass returns unparseable or schema-violating JSON."""


class ClaudeArchitect:
    def __init__(self) -> None:
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._model = "claude-opus-4-8"   # extended thinking requires Opus

    # ── Internal helpers ──────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type((anthropic.APITimeoutError, anthropic.RateLimitError)),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(4),
        reraise=True,
    )
    def _call(
        self,
        messages: list[dict[str, Any]],
        *,
        use_thinking: bool = False,
        max_tokens: int = 8_192,
    ) -> str:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "max_tokens": max_tokens,
            "system": [
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            "messages": messages,
        }

        if use_thinking:
            kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": 10_000,
            }
            # Thinking requires a higher max_tokens ceiling
            kwargs["max_tokens"] = max(max_tokens, 16_000)
            # betas header required for extended thinking
            kwargs["betas"] = ["interleaved-thinking-2025-05-14"]

        response = self._client.beta.messages.create(**kwargs)  # type: ignore[call-overload]

        # Extract the text block (may be preceded by a thinking block)
        for block in response.content:
            if block.type == "text":
                return block.text

        raise AnalysisPassError("Claude returned no text block")

    @staticmethod
    def _parse_json(raw: str, pass_name: str) -> dict[str, Any]:
        text = raw.strip()
        # Strip markdown code fences if Claude wraps the output despite the instruction
        if text.startswith("```"):
            text = text.split("```", 2)[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.rsplit("```", 1)[0].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise AnalysisPassError(f"[{pass_name}] JSON parse failed: {exc}\n\nRaw:\n{raw[:500]}")

    # ── Pass 1 — Data Model Extraction ───────────────────────────────────────

    def _pass_schema(self, ast_dict: dict[str, Any]) -> dict[str, Any]:
        log.info("claude_pass", pass_name="schema")

        # Filter to only data-layer files for this pass
        data_files = [
            f for f in ast_dict["files"]
            if f["layer"] in ("data", "migration") or f["has_sqlalchemy_models"]
        ]

        prompt = (
            "## Pass 1 — Data Model Analysis\n\n"
            "Below is the AST metadata for all data-layer files in the repository.\n"
            "Extract every SQLAlchemy model / database entity and for each:\n"
            "- List its fields (from __init__ args or Column definitions)\n"
            "- Identify foreign keys and relationships\n"
            "- Flag any model accessed from multiple service layers\n\n"
            "Return a JSON object with key `data_models`: an array of model objects.\n\n"
            f"```json\n{json.dumps({'data_layer_files': data_files}, indent=2)}\n```"
        )

        raw = self._call([{"role": "user", "content": prompt}])
        result = self._parse_json(raw, "schema")
        log.info("claude_pass_complete", pass_name="schema", models=len(result.get("data_models", [])))
        return result

    # ── Pass 2 — Dependency Graph Analysis ───────────────────────────────────

    def _pass_graph(
        self, ast_dict: dict[str, Any], schema_result: dict[str, Any]
    ) -> dict[str, Any]:
        log.info("claude_pass", pass_name="graph")

        prompt = (
            "## Pass 2 — Dependency Graph Analysis\n\n"
            "Using the data model summary from Pass 1 and the full dependency graph below,\n"
            "identify which modules are tightly coupled and which have clean interfaces.\n\n"
            "For each file, determine:\n"
            "- Which business capability it implements\n"
            "- Its coupling score (low / medium / high) based on inbound import count\n"
            "- Whether it crosses what should be a service boundary\n\n"
            "Return JSON with key `module_map`: an array of {path, capability, coupling, crosses_boundary}.\n\n"
            f"### Pass 1 Summary\n```json\n{json.dumps(schema_result, indent=2)}\n```\n\n"
            f"### Dependency Graph\n```json\n{json.dumps(ast_dict['dependency_graph'], indent=2)}\n```\n\n"
            f"### Coupling Hotspots\n```json\n{json.dumps(ast_dict['coupling_hotspots'], indent=2)}\n```"
        )

        raw = self._call(
            [{"role": "user", "content": prompt}],
            use_thinking=False,
        )
        result = self._parse_json(raw, "graph")
        log.info("claude_pass_complete", pass_name="graph", modules=len(result.get("module_map", [])))
        return result

    # ── Pass 3 — Bounded Context Identification ───────────────────────────────

    def _pass_contexts(
        self,
        ast_context: str,
        schema_result: dict[str, Any],
        graph_result: dict[str, Any],
    ) -> dict[str, Any]:
        log.info("claude_pass", pass_name="contexts")

        prompt = (
            "## Pass 3 — Bounded Context Identification\n\n"
            "Using the data models (Pass 1), module capability map (Pass 2), "
            "and the full AST context below, define 3-7 Bounded Contexts "
            "following Domain-Driven Design principles.\n\n"
            "For each context:\n"
            "- Name it after the business capability (not the technical layer)\n"
            "- List every file and class that belongs to it\n"
            "- Identify data ownership conflicts (shared tables)\n"
            "- Flag the context with the fewest inbound dependencies as Phase 1\n\n"
            "Return JSON with key `bounded_contexts`: array matching the final blueprint schema.\n\n"
            f"### Pass 1 (Data Models)\n```json\n{json.dumps(schema_result, indent=2)}\n```\n\n"
            f"### Pass 2 (Module Map)\n```json\n{json.dumps(graph_result, indent=2)}\n```\n\n"
            f"### Full AST Context\n{ast_context}"
        )

        raw = self._call(
            [{"role": "user", "content": prompt}],
            use_thinking=True,    # extended thinking for the hardest pass
            max_tokens=16_000,
        )
        result = self._parse_json(raw, "contexts")
        log.info(
            "claude_pass_complete",
            pass_name="contexts",
            contexts=len(result.get("bounded_contexts", [])),
        )
        return result

    # ── Pass 4 — Strangler Fig Blueprint ─────────────────────────────────────

    def _pass_blueprint(
        self,
        schema_result: dict[str, Any],
        graph_result: dict[str, Any],
        context_result: dict[str, Any],
        repo_name: str,
    ) -> dict[str, Any]:
        log.info("claude_pass", pass_name="blueprint")

        prompt = (
            f"## Pass 4 — Strangler Fig Migration Blueprint for `{repo_name}`\n\n"
            "Using all prior analysis, generate the complete migration blueprint.\n\n"
            "Requirements:\n"
            "1. Order migration phases by ascending inbound dependency count\n"
            "2. Each phase must be independently deployable — no big-bang cutovers\n"
            "3. Specify the exact HTTP paths or Celery queues the strangler proxy intercepts\n"
            "4. Call out every shared-DB risk with a concrete resolution strategy\n"
            "5. Write an executive_summary a CTO can present to the board\n\n"
            "Your response MUST be ONLY the final JSON blueprint — no other text.\n\n"
            f"### Bounded Contexts\n```json\n{json.dumps(context_result, indent=2)}\n```\n\n"
            f"### Data Models\n```json\n{json.dumps(schema_result, indent=2)}\n```\n\n"
            f"### Module Map\n```json\n{json.dumps(graph_result, indent=2)}\n```"
        )

        raw = self._call(
            [{"role": "user", "content": prompt}],
            use_thinking=True,
            max_tokens=16_000,
        )
        result = self._parse_json(raw, "blueprint")
        log.info(
            "claude_pass_complete",
            pass_name="blueprint",
            phases=len(result.get("migration_phases", [])),
        )
        return result

    # ── Public entry point ────────────────────────────────────────────────────

    def generate_blueprint(
        self,
        ast_result: RepositoryAST,
        analyzer: ASTAnalyzer,
    ) -> dict[str, Any]:
        """
        Run all four passes and return the merged migration blueprint.
        Each pass result is returned in `_debug_passes` for observability.
        """
        ast_dict = analyzer.to_dict(ast_result)
        ast_context = analyzer.to_llm_context(ast_result, max_tokens=80_000)

        schema_result = self._pass_schema(ast_dict)
        graph_result = self._pass_graph(ast_dict, schema_result)
        context_result = self._pass_contexts(ast_context, schema_result, graph_result)
        blueprint = self._pass_blueprint(schema_result, graph_result, context_result, ast_result.repo_name)

        # Merge context definitions into the blueprint if the blueprint omitted them
        if "bounded_contexts" not in blueprint and "bounded_contexts" in context_result:
            blueprint["bounded_contexts"] = context_result["bounded_contexts"]

        blueprint["_meta"] = {
            "repo_name": ast_result.repo_name,
            "total_files": ast_result.total_files,
            "total_tokens": ast_result.total_tokens,
            "python_files": ast_result.python_files,
            "model": self._model,
        }

        log.info(
            "blueprint_generated",
            repo=ast_result.repo_name,
            contexts=len(blueprint.get("bounded_contexts", [])),
            phases=len(blueprint.get("migration_phases", [])),
        )
        return blueprint
