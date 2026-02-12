# .ai workspace

This folder is the shared AI workspace for this repository.
It is the single source of truth for agent behavior and context.

## Structure

- `constitution.md`: global operating rules.
- `entrypoints/`: agent-specific entry files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`).
- `rules/`: shared execution, style, safety, and React constraints.
- `context/`: repo-backed architecture, commands, decisions, and glossary.
- `snippets/`: reusable code patterns (e.g., HTTP layer pattern).
- `tooling/`: reserved for automation assets.

## Compatibility links

Repository root links `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and dotfolders (`.codex`, `.claude`, `.gemini`, `.opencode`, `.cursor`) point to this workspace.

## Rules index

| File | Covers |
|------|--------|
| `rules/core.md` | Default workflow, minimal diffs, evidence-based execution |
| `rules/code-style.md` | TypeScript conventions, file naming, layer structure, file size limits |
| `rules/react.md` | Server Components, useEffect discipline, antd, React Hook Form |
| `rules/safety.md` | Secrets, migrations, rollback strategies |
