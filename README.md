# Collabill

Collabill is a Next.js 16 application for team collaboration and billing workflows. It combines a web UI (`app/`), server actions/controllers (`http/controllers/`), a typed API layer with Hono (`http/routes/`), and a PostgreSQL schema managed by Drizzle (`db/schema/`).

## Prerequisites

- Node.js + pnpm (project uses `pnpm-lock.yaml`)
- PostgreSQL (or `docker compose`)
- Environment variables in `.env` (see `.env.example`)

## Quickstart

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm dev
```

App runs at `http://localhost:3000` by default.

## Commands

- `pnpm dev`: start Next.js dev server.
- `pnpm build`: create production build.
- `pnpm start`: run production build.
- `pnpm lint`: run Biome checks.
- `pnpm drizzle:generate`: generate migrations from schema.
- `pnpm drizzle:push`: push schema to database.
- `pnpm drizzle:migrate`: apply migrations.
- `pnpm drizzle:pull`: introspect DB schema.
- `pnpm create:user`: run interactive user creation script.

## Configuration

Environment variable names used by code:

- `DATABASE_URL` (`db/index.ts`, `drizzle.config.ts`)
- `NEXT_PUBLIC_APP_URL` (`http/controllers/invite-user-controller.ts`, `http/controllers/forgot-password-controller.ts`)
- `SENDGRID_API_KEY` and `MAIL_FROM` (`lib/email.ts`)
- `NODE_ENV` for secure session cookie behavior (`http/controllers/sign-in.ts`)

## Repository Structure

- `app/`: App Router pages/layouts and API route bridge.
- `http/`: controllers, repositories, routes, scripts.
- `db/`: Drizzle schema, relations, migration SQL and snapshots.
- `lib/`: shared utilities (email, session helpers, query helpers).
- `packages/hono/`: generated/typed API client setup.
- `providers/`: React providers (Ant Design, React Query).

## Validation

No dedicated test runner is configured yet. Use:

```bash
pnpm lint
pnpm build
```

## TODOs

- Define and enforce a Node.js/pnpm version policy (no `engines` field is set in `package.json`).
- Add a test runner and `test` script, then document expected coverage gates.

## References

- `package.json`
- `docker-compose.yml`
- `db/schema/schema.ts`
- `http/routes/index.ts`
- `app/api/[[...route]]/route.ts`
