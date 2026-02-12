# Code Style

## Tooling

- **Biome** is the primary linter and formatter (`biome.json`). Run `pnpm lint:fix` to auto-fix.

## TypeScript

- Arrow functions by default. Named `function` declarations only for hoisted utilities.
- Strict mode (`strict: true`). Never use `any`; prefer `unknown` + narrowing.
- Prefer `const` over `let`. No `var`.
- Use Zod for runtime validation at system boundaries.

## File size

- Target ~250 LOC per file. Refactor if significantly beyond.
- Exceptions: generated files, migration SQL.

## Naming conventions

### `app/`

- Route groups: `(auth)/`, `(private)/`.
- Colocated folders (underscore prefix, not routed): `_components/`, `_hooks/`, `_statics/`, `_utils/`.
- Files: `kebab-case.tsx`.
- **Proximity principle:** Keep colocated folders as close as possible to the files that use them. If a hook/component/util is used by a single route, it lives in that route's folder. If shared across sibling routes, move it up to the nearest common parent — but no higher.

### `http/`

- **Models** (`http/models/`): `<entity>.model.ts` — Zod validation schemas and types inferred via `z.infer`. Single source of truth for input shapes, shared across actions, controllers, and client components.
- **Controllers** (`http/controllers/`): `<entity>.controller.ts` — Hono endpoint handlers using `createFactory`. Export individual handler functions, not objects.
- **Actions** (`http/actions/`): `<entity>.action.ts` — Server Actions (`"use server"`). Import schemas from models for validation. Call repositories for data access. Reusable from client components.
- **Middleware** (`http/middleware/`): `<entity>.middleware.ts` — Hono middleware using `createMiddleware`. Applied in `routes/index.ts`.
- **Repositories** (`http/repositories/`): `<entity>.repository.ts` — Drizzle data-access layer only. No business logic, no cookies, no infrastructure concerns.
- **Routes** (`http/routes/`): `<entity>.route.ts` — Hono route files wiring controllers. Mounted in `routes/index.ts`.

### `db/`

- **Client** (`db/index.ts`): Drizzle client singleton. Imports all schemas via `db/schema/index.ts`.
- **Schema** (`db/schema/`): Table definitions, relations, and enums.
  - `enums.ts` — Shared `pgEnum` declarations. Enums live here (not in entity files) to prevent circular imports.
  - `<entity>.ts` — Table definitions **and** their relations, colocated in one file per entity. Entity grouping follows domain boundaries (e.g. `user.ts` includes `users`, `userRoles`, `collaboratorRates`).
  - `index.ts` — Barrel re-export of all entity files and enums. This is the single import target for `db/index.ts` and `drizzle.config.ts`.
- **Migration** (`db/migration/`): Drizzle Kit generated SQL and `meta/` snapshots. Never hand-edit. Corresponds to `out` in `drizzle.config.ts`.

**Cycle-import rules for schema files:**
- Entity files import **enums** from `./enums`.
- Entity files import **table objects** from other entity files only for FK `.references()`. This is safe because table objects are plain column descriptors with no circular dependency.
- Never import relations from another entity file.

### `lib/`

- Utility functions usable on both client and server.
- Filename describes the domain entity: `date.ts` for date helpers, `text.ts` for text formatting, `currency.ts` for money formatting.
- No DB imports. No server-only imports.

### `packages/`

- Configuration wrappers for third-party libraries.
- Each package exports a configured instance, provider, or typed client.
- Examples: `packages/hono/` (typed client), `packages/react-query/` (provider + client config), `packages/antd/` (provider + theme config).
