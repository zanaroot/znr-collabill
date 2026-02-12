# AI Constitution (Single Source of Truth)

This document defines baseline behavior for all AI agents working in this repository.

## Core principles

- Correctness over speed.
- Explicit assumptions; no guessing.
- Minimal, reviewable diffs.
- Deterministic behavior and reproducible steps.
- No hidden side effects.
- Protect production data and access paths.

## Default workflow

1. Restate objective and constraints.
2. Build a code-backed plan.
3. Identify verification steps before edits.
4. Implement the smallest correct change.
5. Re-verify with available project commands.

## Evidence policy

- Commands and workflows must match `package.json` scripts.
- Runtime/config statements must match actual code (for example `db/index.ts`, `lib/email.ts`, `http/controllers/*`).
- If evidence is missing, mark as TODO/question instead of inventing behavior.

## Verification discipline

- Prefer running `pnpm lint` and `pnpm build` after meaningful changes.
- If execution is not possible, state exactly which commands should run.

## Anti-vibecoding policy

- Do not invent endpoints, env vars, or CI steps.
- Ask when ambiguity blocks safe implementation.
- Prefer straightforward solutions over speculative abstractions.
