"""
ASTAnalyzer — deep structural analysis of a Python repository.

Responsibilities:
- Walk a filtered file tree
- Extract per-file: classes (with methods), top-level functions, imports
- Build a cross-file import dependency graph
- Bucket files into semantic layers (data, api, service, task, test, config, util)
- Produce a compact, LLM-ready JSON summary
"""

import ast
import os
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import structlog
import tiktoken

log = structlog.get_logger(__name__)

ENCODING = tiktoken.get_encoding("cl100k_base")

# ── Layer heuristics ─────────────────────────────────────────────────────────
# Ordered so more-specific patterns are checked first.
_LAYER_RULES: list[tuple[str, list[str]]] = [
    ("test", ["test_", "_test", "/tests/", "/test/"]),
    ("migration", ["/migrations/", "/alembic/", "/versions/"]),
    ("api", ["/routes/", "/views/", "/endpoints/", "/controllers/", "/api/"]),
    ("data", ["/models/", "/schemas/", "/entities/", "/domain/"]),
    ("service", ["/services/", "/use_cases/", "/usecases/", "/handlers/"]),
    ("task", ["/tasks/", "/workers/", "/jobs/", "/celery/"]),
    ("config", ["/config", "/settings", "/conf/"]),
    ("util", ["/utils/", "/helpers/", "/lib/"]),
]


def _classify_layer(rel_path: str) -> str:
    normalized = "/" + rel_path.replace("\\", "/")
    for layer, patterns in _LAYER_RULES:
        if any(p in normalized for p in patterns):
            return layer
    return "other"


@dataclass
class FunctionSummary:
    name: str
    line: int
    is_async: bool
    args: list[str]
    decorators: list[str]
    docstring: str | None
    calls: list[str]  # names of functions/methods called in the body


@dataclass
class ClassSummary:
    name: str
    line: int
    bases: list[str]
    docstring: str | None
    methods: list[FunctionSummary]


@dataclass
class FileSummary:
    path: str
    layer: str
    token_count: int
    imports: list[str]
    internal_imports: list[str]      # imports pointing to other project files
    external_imports: list[str]      # third-party / stdlib
    classes: list[ClassSummary]
    functions: list[FunctionSummary]  # top-level only
    has_sqlalchemy_models: bool
    has_fastapi_routes: bool
    has_celery_tasks: bool
    parse_error: str | None


@dataclass
class RepositoryAST:
    repo_name: str
    total_files: int
    total_tokens: int
    python_files: int
    layers: dict[str, list[str]]          # layer → [paths]
    files: list[FileSummary]
    dependency_graph: dict[str, list[str]]  # path → [imported paths]
    coupling_hotspots: list[dict[str, Any]]  # files imported by many others


# ── AST visitors ─────────────────────────────────────────────────────────────

class _CallCollector(ast.NodeVisitor):
    """Collect all function/method call names within a node subtree."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name):
            self.calls.append(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            self.calls.append(node.func.attr)
        self.generic_visit(node)


def _extract_function(node: ast.FunctionDef | ast.AsyncFunctionDef) -> FunctionSummary:
    collector = _CallCollector()
    collector.visit(node)
    return FunctionSummary(
        name=node.name,
        line=node.lineno,
        is_async=isinstance(node, ast.AsyncFunctionDef),
        args=[a.arg for a in node.args.args],
        decorators=[ast.unparse(d) for d in node.decorator_list],
        docstring=ast.get_docstring(node),
        calls=list(dict.fromkeys(collector.calls)),  # deduplicate, preserve order
    )


def _extract_class(node: ast.ClassDef) -> ClassSummary:
    methods: list[FunctionSummary] = []
    for child in ast.walk(node):
        if isinstance(child, ast.FunctionDef | ast.AsyncFunctionDef):
            methods.append(_extract_function(child))
    return ClassSummary(
        name=node.name,
        line=node.lineno,
        bases=[ast.unparse(b) for b in node.bases],
        docstring=ast.get_docstring(node),
        methods=methods,
    )


def _resolve_internal_import(
    module: str, rel_path: str, package_root: str
) -> str | None:
    """Convert a dotted import string to a relative file path if it belongs to the project."""
    parts = module.split(".")
    candidate = Path(*parts).with_suffix(".py")
    candidate_init = Path(*parts) / "__init__.py"
    base = Path(package_root)
    if (base / candidate).exists() or (base / candidate_init).exists():
        return str(candidate)
    return None


def _parse_file(
    path: Path, repo_root: Path, package_root: str
) -> FileSummary:
    rel_path = str(path.relative_to(repo_root))
    source = path.read_text(encoding="utf-8", errors="ignore")
    token_count = len(ENCODING.encode(source, disallowed_special=()))
    layer = _classify_layer(rel_path)

    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return FileSummary(
            path=rel_path, layer=layer, token_count=token_count,
            imports=[], internal_imports=[], external_imports=[],
            classes=[], functions=[],
            has_sqlalchemy_models=False, has_fastapi_routes=False,
            has_celery_tasks=False, parse_error=str(exc),
        )

    all_imports: list[str] = []
    internal_imports: list[str] = []
    external_imports: list[str] = []
    top_level_classes: list[ClassSummary] = []
    top_level_functions: list[FunctionSummary] = []

    # Track structural markers
    has_sqlalchemy = False
    has_fastapi = False
    has_celery = False

    # Only walk direct children of Module for top-level extraction
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                all_imports.append(alias.name)
                resolved = _resolve_internal_import(alias.name, rel_path, package_root)
                if resolved:
                    internal_imports.append(resolved)
                else:
                    external_imports.append(alias.name)

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            all_imports.append(module)
            resolved = _resolve_internal_import(module, rel_path, package_root)
            if resolved:
                internal_imports.append(resolved)
            else:
                external_imports.append(module)
            # Marker detection
            if "sqlalchemy" in module:
                has_sqlalchemy = True
            if "fastapi" in module:
                has_fastapi = True
            if "celery" in module:
                has_celery = True

        elif isinstance(node, ast.ClassDef):
            cls = _extract_class(node)
            top_level_classes.append(cls)
            # SQLAlchemy model detection via base class names
            if any(b in ("Base", "DeclarativeBase", "Model") for b in cls.bases):
                has_sqlalchemy = True

        elif isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            fn = _extract_function(node)
            top_level_functions.append(fn)
            # FastAPI route detection via decorators
            if any(
                "router." in d or "app." in d
                for d in fn.decorators
            ):
                has_fastapi = True
            # Celery task detection
            if any("task" in d or "shared_task" in d for d in fn.decorators):
                has_celery = True

    return FileSummary(
        path=rel_path,
        layer=layer,
        token_count=token_count,
        imports=list(dict.fromkeys(all_imports)),
        internal_imports=list(dict.fromkeys(internal_imports)),
        external_imports=list(dict.fromkeys(external_imports)),
        classes=top_level_classes,
        functions=top_level_functions,
        has_sqlalchemy_models=has_sqlalchemy,
        has_fastapi_routes=has_fastapi,
        has_celery_tasks=has_celery,
        parse_error=None,
    )


# ── Public API ────────────────────────────────────────────────────────────────

class ASTAnalyzer:
    def __init__(self, repo_root: Path, python_files: list[Path]) -> None:
        self._root = repo_root
        self._files = python_files
        # Infer the package root as the deepest common ancestor that contains __init__.py
        self._package_root = str(repo_root)

    def analyze(self, repo_name: str, total_files: int, total_tokens: int) -> RepositoryAST:
        log.info("ast_analysis_start", repo=repo_name, python_files=len(self._files))

        file_summaries: list[FileSummary] = []
        layers: dict[str, list[str]] = defaultdict(list)
        dep_graph: dict[str, list[str]] = {}
        inbound_count: dict[str, int] = defaultdict(int)

        for path in self._files:
            summary = _parse_file(path, self._root, self._package_root)
            file_summaries.append(summary)
            layers[summary.layer].append(summary.path)
            dep_graph[summary.path] = summary.internal_imports
            for imp in summary.internal_imports:
                inbound_count[imp] += 1

        # Coupling hotspots: files imported by 3+ other files
        hotspots = [
            {"path": p, "inbound_imports": count}
            for p, count in sorted(inbound_count.items(), key=lambda x: -x[1])
            if count >= 3
        ]

        log.info(
            "ast_analysis_complete",
            layers={k: len(v) for k, v in layers.items()},
            hotspots=len(hotspots),
        )

        return RepositoryAST(
            repo_name=repo_name,
            total_files=total_files,
            total_tokens=total_tokens,
            python_files=len(self._files),
            layers=dict(layers),
            files=file_summaries,
            dependency_graph=dep_graph,
            coupling_hotspots=hotspots,
        )

    def to_dict(self, result: RepositoryAST) -> dict[str, Any]:
        """Serialize RepositoryAST to a JSON-safe dict."""

        def _fn(f: FunctionSummary) -> dict[str, Any]:
            return {
                "name": f.name, "line": f.line, "is_async": f.is_async,
                "args": f.args, "decorators": f.decorators,
                "docstring": f.docstring, "calls": f.calls,
            }

        def _cls(c: ClassSummary) -> dict[str, Any]:
            return {
                "name": c.name, "line": c.line, "bases": c.bases,
                "docstring": c.docstring,
                "methods": [_fn(m) for m in c.methods],
            }

        def _file(f: FileSummary) -> dict[str, Any]:
            return {
                "path": f.path, "layer": f.layer, "token_count": f.token_count,
                "imports": f.imports,
                "internal_imports": f.internal_imports,
                "external_imports": f.external_imports[:20],  # cap for token budget
                "classes": [_cls(c) for c in f.classes],
                "functions": [_fn(fn) for fn in f.functions],
                "has_sqlalchemy_models": f.has_sqlalchemy_models,
                "has_fastapi_routes": f.has_fastapi_routes,
                "has_celery_tasks": f.has_celery_tasks,
                "parse_error": f.parse_error,
            }

        return {
            "repo_name": result.repo_name,
            "total_files": result.total_files,
            "total_tokens": result.total_tokens,
            "python_files": result.python_files,
            "layers": result.layers,
            "files": [_file(f) for f in result.files],
            "dependency_graph": result.dependency_graph,
            "coupling_hotspots": result.coupling_hotspots,
        }

    def to_llm_context(self, result: RepositoryAST, max_tokens: int = 80_000) -> str:
        """
        Produce a compact, structured text representation of the repository
        optimised for LLM context.  Stays within max_tokens by progressively
        dropping method bodies and capping file lists.
        """
        lines: list[str] = [
            f"# Repository: {result.repo_name}",
            f"# Python files: {result.python_files} | Total tokens: {result.total_tokens:,}",
            "",
            "## Layer Distribution",
        ]
        for layer, paths in result.layers.items():
            lines.append(f"  {layer}: {len(paths)} files")

        lines.append("\n## Coupling Hotspots (imported by 3+ files)")
        for h in result.coupling_hotspots[:10]:
            lines.append(f"  {h['path']}  ← {h['inbound_imports']} imports")

        lines.append("\n## File Summaries")
        token_budget = max_tokens - len(ENCODING.encode("\n".join(lines), disallowed_special=()))

        for f in result.files:
            if f.parse_error:
                continue

            block: list[str] = [f"\n### {f.path}  [{f.layer}]  ({f.token_count} tokens)"]

            if f.internal_imports:
                block.append(f"  imports: {', '.join(f.internal_imports[:8])}")
            if f.has_sqlalchemy_models:
                block.append("  [SQLAlchemy models]")
            if f.has_fastapi_routes:
                block.append("  [FastAPI routes]")
            if f.has_celery_tasks:
                block.append("  [Celery tasks]")

            for cls in f.classes:
                method_names = ", ".join(m.name for m in cls.methods[:12])
                block.append(f"  class {cls.name}({', '.join(cls.bases)})")
                if method_names:
                    block.append(f"    methods: {method_names}")

            for fn in f.functions[:15]:
                async_prefix = "async " if fn.is_async else ""
                dec = f"  @{fn.decorators[0]}" if fn.decorators else ""
                block.append(f"  {dec}  {async_prefix}def {fn.name}({', '.join(fn.args[:6])})")

            block_text = "\n".join(block)
            block_tokens = len(ENCODING.encode(block_text, disallowed_special=()))
            if block_tokens > token_budget:
                break
            token_budget -= block_tokens
            lines.extend(block)

        return "\n".join(lines)
