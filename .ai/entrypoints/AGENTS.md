# AGENTS.md - Collabill Development Guide

This file is the root entrypoint for AI agents in this repository. Start here, then read [README.md](README.md) for user-facing setup and deployment details.

## Repository Overview

Collabill is a `Next.js 16` App Router application for collaboration and billing workflows. The current stack in `package.json` centers on:

- `next@16`, `react@19`, `typescript@5`
- `antd@6` for UI
- `hono@4` mounted under `/api`
- `drizzle-orm` with PostgreSQL
- `zod@4` for validation
- `@tanstack/react-query` for server state
- `vitest` + Testing Library for unit tests

## Quick Start

```bash
pnpm install
cp .env.example .env.dev
docker compose up -d
pnpm dev
```

## Build, Lint, and Test Commands

### Development

```bash
pnpm install
cp .env.example .env.dev
docker compose up -d
pnpm dev
pnpm dev:env
pnpm env:set -- <KEY> <VALUE>
```

### Build and Serve

```bash
pnpm build
pnpm build:prod
pnpm start
```

### Code Quality

```bash
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:fix
pnpm typecheck
```

### Database

```bash
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:pull
pnpm db:seed
pnpm db:seed:dev
```

### Testing

Vitest is configured in `vitest.config.ts`. Current unit tests live in `app/`, `http/models/`, and `lib/`.

```bash
pnpm test:unit
pnpm test:unit:ui
pnpm test:unit:interactive
```

## Architecture Map

- `app/`: Next.js App Router UI.
  - `app/(auth)`: public auth and onboarding pages.
  - `app/(private)`: protected product pages such as invoices, projects, task board, team management, and presence/settings UI.
  - `app/api/[[...route]]/route.ts`: bridges Hono to Next via `handle(app)`.
- `middleware.ts`: redirects unauthenticated requests for protected routes based on `session_token` cookie presence.
- `http/`: API and server orchestration.
  - `http/routes/index.ts`: mounts public auth/password/invitation routes, then authenticated invoice, task, project, organization, integration, presence, and user routes; also exposes `/api/openapi.json` and `/api/docs`.
  - `http/models/`: Zod schemas and shared types.
  - `http/controllers/`: Hono handlers.
  - `http/actions/`: server actions and server-only queries.
  - `http/repositories/`: Drizzle data access.
  - `http/middleware/`: Hono middleware.
- `db/`: Drizzle schema, migrations, and seeds.
  - `db/index.ts`: global `postgres` + Drizzle singleton.
  - `db/schema/`: entity files plus `enums.ts` and barrel exports.
- `packages/`: repo-approved wrappers and providers.
  - `packages/antd`, `packages/react-query`, `packages/hono`
  - `packages/env`, `packages/email`, `packages/minio`, `packages/slack`
- `lib/`: shared utilities and pure helpers.
- `.github/workflows/`: CI/CD.
  - `validation.yml`: runs `pnpm lint`, `pnpm typecheck`, and `pnpm test:unit`.
  - `build-images.yml`: builds GHCR image after successful validation on `main`.
  - `deploy.yml`: manual deploy to the Docker host.

## Code Style Guidelines

### Tooling

- Biome is the primary formatter and linter.
- TypeScript strict mode is enabled.
- Use Zod at system boundaries.
- Prefer repo wrappers in `packages/*` before introducing new integration helpers.

### TypeScript Conventions

- Use arrow functions by default.
- Never use `any`.
- Prefer `unknown` plus narrowing when compile-time type is genuinely unavailable.
- Prefer `const` over `let`.
- Target roughly 250 LOC per file unless a generated or schema file clearly warrants more.

### Naming Conventions

- `app/`: route groups like `(auth)` and `(private)`; colocated folders such as `_components`, `_hooks`, `_utils`; file names in `kebab-case`.
- `http/models/`: `<entity>.model.ts`
- `http/controllers/`: `<entity>.controller.ts`
- `http/actions/`: `<entity>.action.ts`
- `http/middleware/`: `<entity>.middleware.ts`
- `http/repositories/`: `<entity>.repository.ts`
- `http/routes/`: `<entity>.route.ts`
- `db/schema/`: one entity-focused file per domain plus `enums.ts`
- `lib/`: `<domain>.ts`

### React and Next.js Patterns

- Server Components by default.
- `layout.tsx` and `page.tsx` stay server-side.
- Use `"use client"` only for hooks, browser APIs, event handlers, or interactive antd usage.
- Use Ant Design for UI primitives.
- Use React Hook Form + Zod for forms.
- Minimize `useEffect`; prefer server fetches, React Query, derived state, or event handlers.
- Keep colocated code as near as possible to its consuming route.

### Data and Error Handling

- Models define schemas and shared types.
- Repositories handle database access only.
- Controllers and actions validate at boundaries and orchestrate behavior.
- Let repository/database errors propagate unless a boundary must translate them.

## Package Research Guidance

- Before using an unfamiliar package or an advanced API, check Context7 or the package's official docs first.
- Prefer patterns already established in this repo, especially under `.ai/skills/`, `packages/*`, and nearby feature code.
- Record version-sensitive assumptions when they matter. Current notable versions from `package.json`: Next `16.1.5`, React `19.2.3`, antd `6.2.2`, Hono `4.11.9`, Drizzle `0.45.1`, Zod `4.3.6`, Vitest `4.1.2`.

## Available Skills

Local repo skills currently present under `.ai/skills/`:

- `ant-design`
- `biome`
- `brevo`
- `drizzle-orm`
- `env-vars`
- `hono-routing`
- `next-best-practices`
- `react-hook-form`
- `react-query`
- `vercel-react-best-practices`
- `zod`

## Mandatory Reads Before Edits

1. `.ai/context/architecture.md`
2. `.ai/rules/code-style.md`
3. `.ai/rules/react.md`
4. `.ai/context/commands.md`
5. `.ai/constitution.md`

Useful supporting context when the task touches process or safety:

- `.ai/README.md`
- `.ai/rules/core.md`
- `.ai/rules/safety.md`
- `.ai/context/decisions.md`

## Constraints

- Keep edits minimal and aligned to existing patterns.
- Do not create new top-level directories without justification.
- Verify with `pnpm lint` after changes.
- Run `pnpm build` before committing significant changes.
- Never commit secrets or env files.
- Keep `.codex` excluded in `.git/info/exclude`.

## Database Schema Rules

- Keep table definitions and relations colocated in one entity-focused schema file.
- Put shared enums in `db/schema/enums.ts`.
- Import enums from `./enums`.
- Do not hand-edit `db/migration/` files.
- Use the `db:generate` -> `db:push` or `db:migrate` workflow.
