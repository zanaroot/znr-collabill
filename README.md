# Collabill

Collabill is a Next.js 16 app for collaboration and billing workflows. It uses:

- Next.js App Router (`app/`)
- Hono API mounted at `/api` (`http/routes/`, bridged by `app/api/[[...route]]/route.ts`)
- Drizzle + PostgreSQL (`db/`)
- Ant Design + React Query providers (`packages/antd`, `packages/react-query`)

## Prerequisites

- Node.js + pnpm
- PostgreSQL (local or via Docker)
- `.env.dev` file (start from `.env.example`)

## Quickstart

```bash
pnpm install
cp .env.example .env.dev
docker compose up -d
pnpm dev
```

App URL: `http://localhost:3000`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `NEXT_PUBLIC_APP_URL`: Public app base URL used to build links in emails.
- `BREVO_API_KEY`: API key for Brevo (or another email provider) to send emails.
- `MAIL_FROM`: The "From" address for outgoing emails.
- `SEED_OWNER_EMAIL`, `SEED_COLLABORATOR_EMAIL`, `SEED_PASSWORD`: Optional seed overrides for `pnpm db:seed` and `pnpm db:seed:dev`.

Use `pnpm env:set -- <KEY> <VALUE>` to add a new variable to `.env.dev` or update an existing one via `dotenvx` through `scripts/env-set.sh`.

Examples:

```bash
pnpm env:set -- BREVO_API_KEY "xkeysib-..."
pnpm env:set -- RESEND_API_KEY "re_..."
pnpm env:set -- SOME_EXISTING_KEY "new-value"
```

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm env:set -- <KEY> <VALUE>

pnpm lint
pnpm lint:fix
pnpm format

pnpm drizzle:generate
pnpm drizzle:push
pnpm drizzle:migrate
pnpm drizzle:pull

pnpm create:user
```

`pnpm create:user` runs `http/scripts/create-user.ts` and expects email, name, password, and role (`OWNER` or `COLLABORATOR`).

## Production Deployment

```bash
# Create production env file
cp .env.example .env.prod

# Start all services (Next.js + postgres + minio)
./start-prod.sh
```

Or run only Next.js (if infrastructure already exists):

```bash
docker compose -f docker-compose.prod.yml up -d
```

Requires:
- `.env.prod` with production environment variables
- Built Docker image (handled automatically by the compose command)

### Check logs:
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f next`

## Project Structure

- `app/`: routes/layouts, auth pages, private pages, API bridge route.
- `http/actions/`: server actions for auth, invitations, password reset.
- `http/controllers/`: Hono handlers.
- `http/middleware/`: Hono middleware (API auth checks).
- `http/repositories/`: Drizzle data-access layer.
- `http/routes/`: Hono route wiring (currently `/api/users/me` behind auth middleware).
- `http/models/`: Zod schemas and shared types.
- `db/schema/`: PostgreSQL tables, enums, and relations.
- `db/migration/`: generated SQL migrations.
- `packages/hono/`: typed Hono client.
- `packages/antd/`, `packages/react-query/`: app-level providers/config.
- `lib/`: shared utilities (for example, email sending).

## Development Rules

AI/editor workflow guidance is centralized in:

- `AGENTS.md` (entrypoint)
- `.ai/constitution.md`
- `.ai/rules/core.md`
- `.ai/context/architecture.md`
- `.ai/rules/code-style.md`
- `.ai/rules/react.md`
- `.ai/context/commands.md`

## Validation

No `test` script is currently defined. Use:

```bash
pnpm lint
pnpm build
```
