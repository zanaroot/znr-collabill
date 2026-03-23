# Collabill

Collabill is a Next.js 16 app for collaboration and billing workflows. It uses:

- Next.js App Router (`app/`)
- Hono API mounted at `/api` (`http/routes/`, bridged by `app/api/[[...route]]/route.ts`)
- Drizzle + PostgreSQL (`db/`)
- Ant Design + React Query providers (`packages/antd`, `packages/react-query`)

## Prerequisites

- Node.js + pnpm
- PostgreSQL (local or via Docker)
- `.env` file (start from `.env.example`)

## Quickstart

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

App URL: `http://localhost:3000`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `BREVO_API_KEY`: API key for Brevo (or another email provider) to send emails.
- `MAIL_FROM`: The "From" address for outgoing emails.
- `CRON_SECRET`: A secret token to secure the cron job endpoint.

## Cron Jobs

The application includes an endpoint to automatically close iterations when their `endDate` has passed. This is useful for automating your billing or sprint cycles.

To trigger this job, you need to set up a cron job that sends a `POST` request to the following endpoint:

`POST /api/cron/close-iterations`

You must include the `CRON_SECRET` in the `Authorization` header as a bearer token:

```bash
curl -X POST "https://your-app-url.com/api/cron/close-iterations" 
     -H "Authorization: Bearer YOUR_CRON_SECRET"
```

You can use services like [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs), GitHub Actions schedules, or any other cron job provider.

## Commands

```bash
pnpm dev
pnpm build
pnpm start

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
