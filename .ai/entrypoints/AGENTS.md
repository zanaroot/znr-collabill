# AGENTS.md - Collabill Development Guide

This file provides essential information for AI agents operating in this repository.

## Build, Lint, and Test Commands

### Development

```bash
pnpm install           # Install dependencies
cp .env.example .env.dev # Initialize local env file
docker compose up -d   # Start PostgreSQL database
pnpm dev               # Start Next.js dev server (http://localhost:3000)
```

### Build and Serve

```bash
pnpm build             # Production build
pnpm start             # Start production server
```

### Code Quality

```bash
pnpm lint              # Biome check (linting + formatting)
pnpm lint:fix          # Biome auto-fix (formatting + lint)
pnpm format            # Biome format only
pnpm format:fix       # Biome format write
pnpm typecheck         # TypeScript type check (tsc --noEmit)
pnpm env:set -- <KEY> <VALUE> # Set or update an env var in .env.dev via scripts/env-set.sh
```

### Database

```bash
pnpm db:generate       # Generate Drizzle migrations (drizzle-kit generate)
pnpm db:push           # Push schema to DB (drizzle-kit push)
pnpm db:migrate        # Run migrations (drizzle-kit migrate)
pnpm db:pull           # Pull schema from DB
pnpm db:seed           # Seed production database
pnpm db:seed:dev       # Seed development database
```

### Testing

**No test framework is currently configured.** There are no test files in this project.
- If adding tests, prefer Vitest for unit tests
- Run tests with: `pnpm vitest` (once configured)
- Run a single test: `pnpm vitest run <file>` or `pnpm vitest <file>`

---

## Code Style Guidelines

### Tooling

- **Biome** (`biome.json`) is the primary linter and formatter
- **TypeScript** with strict mode enabled
- **Zod** for runtime validation at system boundaries
- **pnpm** as package manager

### TypeScript Conventions

- Use arrow functions by default. Named `function` declarations only for hoisted utilities
- Strict mode: never use `any`; prefer `unknown` + narrowing
- Use `const` over `let`. No `var`
- Target ~250 LOC per file

### Import Organization

```typescript
// Order: external → internal (grouped)
// 1. Next.js/React
// 2. Third-party libs (antd, react-query, hono, drizzle-orm)
// 3. Internal packages (packages/*)
// 4. Internal modules (http/*, app/*, lib/*)
// 5. Types and schemas
// 6. Relative imports
```

### Naming Conventions

| Directory | Pattern | Example |
|-----------|---------|---------|
| `app/` route groups | `(auth)/`, `(private)/` | `(auth)/login/page.tsx` |
| `app/` colocated | `_components/`, `_hooks/` | `app/(private)/_hooks/use-auth.ts` |
| `app/` files | `kebab-case.tsx` | `task-board.tsx` |
| `http/models/` | `<entity>.model.ts` | `auth.model.ts` |
| `http/controllers/` | `<entity>.controller.ts` | `task.controller.ts` |
| `http/actions/` | `<entity>.action.ts` | `task.action.ts` |
| `http/middleware/` | `<entity>.middleware.ts` | `auth.middleware.ts` |
| `http/repositories/` | `<entity>.repository.ts` | `task.repository.ts` |
| `http/routes/` | `<entity>.route.ts` | `task.route.ts` |
| `db/schema/` | `<entity>.ts` | `user.ts` |
| `lib/` | `<domain>.ts` | `date.ts`, `currency.ts` |

### React/Next.js Patterns

- **Server Components by default** in `app/`
- `"use client"` only when required: hooks, browser APIs, event handlers, antd interactive components
- `layout.tsx` and `page.tsx` must be Server Components
- Use Ant Design (`antd`) for UI components
- Use React Hook Form + Zod for form handling
- Minimize `useEffect` - prefer Server-side fetch or React Query

### Error Handling

- Use Zod for input validation at system boundaries
- Actions return `ActionResponse<T>` type from models
- Repository functions throw on DB errors (let them propagate)
- Controllers catch errors and return appropriate HTTP responses

### Styling

- Antd tokens first for component customization
- Tailwind for layout utilities, spacing, responsive tweaks
- `globals.css` for heavy overrides that can't use tokens

### Architecture Layers

| Layer | Path | Role |
|-------|------|------|
| **Models** | `http/models/` | Zod schemas + inferred types |
| **Controllers** | `http/controllers/` | Hono endpoint handlers |
| **Actions** | `http/actions/` | Server Actions + server queries |
| **Middleware** | `http/middleware/` | Hono middleware |
| **Repositories** | `http/repositories/` | Drizzle data access only |
| **Lib** | `lib/` | Pure utilities (client + server) |
| **Packages** | `packages/` | Third-party wrappers |

### Proximity Principle

Keep colocated folders (`_components/`, `_hooks/`, `_utils/`) as close as possible to files that use them:
- If used by a single route, put in that route's folder
- If shared across sibling routes, move to nearest common parent
- Don't elevate to top-level unless truly shared app-wide

---

## Mandatory Reads Before Edits

1. `.ai/context/architecture.md` - Module boundaries and layer responsibilities
2. `.ai/rules/code-style.md` - Naming conventions and file structure
3. `.ai/rules/react.md` - Component patterns and hook discipline
4. `.ai/context/commands.md` - Verified run/build/lint commands
5. `.ai/constitution.md` - Core principles and anti-vibecoding policy

---

## Constraints

- Keep edits minimal and aligned to existing patterns
- Do not create new top-level directories without justification
- Verify with `pnpm lint` after changes
- Run `pnpm build` before committing significant changes
- Never commit secrets or env files

---

## Database Schema Rules

- Table definitions and relations colocated in one file per entity
- Enums in `db/schema/enums.ts` (not in entity files) to prevent circular imports
- Entity files import enums from `./enums`
- Never hand-edit migration files in `db/migration/`
- Use `db:generate` → `db:push` or `db:migrate` workflow
