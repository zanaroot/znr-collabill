# Decisions

Record architectural decisions with:

- Date
- Context
- Decision
- Consequences

## Existing repo-backed decisions

### 2026-02-12 — App Router + Hono API bridge
- Context: Need web UI and API routes in one deployment.
- Decision: Use Next.js App Router with Hono mounted via `app/api/[[...route]]/route.ts` and `http/routes/index.ts`.
- Consequences: API handlers stay typed and colocated; one runtime surface.

### 2026-02-12 — Drizzle + PostgreSQL schema-first modeling
- Context: Need typed relational data model for users, tasks, billing, sessions.
- Decision: Use Drizzle schema in `db/schema/schema.ts` with migration SQL in `db/schema/*.sql`.
- Consequences: Strong typing and explicit migrations; schema changes must be reviewed carefully.

### 2026-02-12 — DB-backed cookie sessions
- Context: Need authenticated private areas.
- Decision: Store session tokens in `sessions` table and set `session_token` cookie in `http/actions/auth.action.ts`; validate via middleware/repository checks.
- Consequences: Session revocation is server-controlled; auth correctness depends on DB + cookie consistency.

### 2026-02-12 — HTTP layer refactor (actions, middleware, flat routes)
- Context: `http/controllers/` mixed Hono handlers with Server Actions. No middleware folder. `routes/groups/` added unnecessary nesting. Repositories had infrastructure concerns (cookies).
- Decision: Split into clear layers: `actions/` (Server Actions + server-only queries), `controllers/` (Hono handlers only), `middleware/` (Hono middleware), `repositories/` (pure data access). Flatten `routes/groups/` to `routes/<entity>.route.ts`. Export handler functions instead of controller objects.
- Consequences: Clear separation of concerns. API routes are now auth-protected via Hono middleware. Repositories are pure data access with no cookie or infrastructure dependencies.
