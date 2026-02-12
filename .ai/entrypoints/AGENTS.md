# Codex Entrypoint

Primary authority:

- `../constitution.md`
- `../rules/core.md`

Mandatory reads before edits:

1. `../context/architecture.md` — module boundaries and layer responsibilities.
2. `../rules/code-style.md` — naming conventions (especially `http/` file naming).
3. `../rules/react.md` — component patterns, hook discipline, antd usage.
4. `../context/commands.md` — only use listed commands.

Constraints:

- Keep edits minimal and aligned to existing patterns.
- Do not create new top-level directories without justification.
- Verify with `pnpm lint` after changes.

Do not duplicate global rules here.
