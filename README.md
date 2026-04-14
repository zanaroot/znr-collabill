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
- `ENCRYPTION_KEY`: Required 32+ character key used by the app.
- `S3_ENDPOINT`: Server-side S3/MinIO endpoint used by the app.
- `NEXT_PUBLIC_S3_ENDPOINT`: Public S3/MinIO endpoint exposed to the browser.
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`: Credentials for the bundled MinIO container.
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`: Credentials used by the app to access S3/MinIO.
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
cp .env.example .env

# Set image reference for the first boot
echo "NEXT_IMAGE=ghcr.io/<owner>/collabill:latest" >> .env

# Set public URLs
pnpm env:set -- NEXT_PUBLIC_APP_URL "https://collabill.tchi.xyz"
pnpm env:set -- NEXT_PUBLIC_S3_ENDPOINT "https://files.collabill.tchi.xyz"

# Copy compose and nginx config to the server
scp -r docker-compose.prod.yml nginx <droplet-user>@<droplet-host>:/var/docker-infra/
scp .env <droplet-user>@<droplet-host>:/var/docker-infra/.env

# Start all services (Next.js + postgres + minio + nginx)
./start-prod.sh
```

Requires:
- `.env` with production environment variables
- `NEXT_IMAGE` pointing at a pushed registry image
- Docker Compose on the target host
- `docker-compose.prod.yml` and `nginx/` copied to the target host

Important:
- `.env.example` is set up for local development, so its default `DATABASE_URL` uses `localhost`. If `.env` runs against the bundled `postgres` container, set `DATABASE_URL` to `postgresql://user:password@postgres:5432/collabill_db` or provide matching `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values.
- `docker-compose.prod.yml` now prefers explicit app env values from `.env` for `DATABASE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`, while keeping bundled service defaults aligned with `.env.example`.
- If you use the bundled `postgres` service with a persisted volume, changing `POSTGRES_PASSWORD` later does not rotate the existing database user's password. In that case, update `DATABASE_URL` to the real live credential or rotate the Postgres role password manually before rerunning migrations.
- `next` is no longer exposed on public port `3000`; `nginx` is the public entrypoint on `80/443`.
- `postgres` and `minio` are internal-only in production. Public file access should go through `https://files.collabill.tchi.xyz`.

### Check logs:
- `docker compose -f docker-compose.prod.yml --env-file .env logs -f next`
- `docker compose -f docker-compose.prod.yml --env-file .env logs -f nginx`

### TLS Setup

The repo ships with:

- `nginx/conf.d/app.conf`: active HTTP-only config used for first boot and Let's Encrypt webroot validation
- `nginx/https.conf.example`: HTTPS config template to activate after the certificate is issued

On the server:

```bash
cd /var/docker-infra

# Start the stack with the HTTP-only nginx config
docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env up -d

# Issue the certificate for both app and files subdomains
docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d collabill.tchi.xyz \
  -d files.collabill.tchi.xyz \
  --email dev@tchi.xyz \
  --agree-tos \
  --no-eff-email

# Switch nginx to the HTTPS config and reload
cp nginx/https.conf.example nginx/conf.d/app.conf
docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env exec nginx nginx -s reload
```

DNS required before certificate issuance:

- `collabill.tchi.xyz` -> droplet IP
- `files.collabill.tchi.xyz` -> droplet IP

## GitHub Actions Deploy

This repository includes:

- `.github/workflows/build-images.yml` to build and push the app image to GHCR after the `Validation` workflow succeeds on `main`
- `.github/workflows/deploy.yml` to deploy a selected image tag manually to a Docker host such as a DigitalOcean Droplet

Expected GitHub secrets:

- `DROPLET_HOST`
- `DROPLET_USER`
- `DROPLET_SSH_KEY`
- `GHCR_USERNAME`
- `GHCR_READ_TOKEN`

The image workflow:

1. Waits for the `Validation` workflow to complete successfully on `main`.
2. Builds and pushes the runtime image to `ghcr.io/<owner>/collabill`.
3. Tags the image as both `latest` and the validated commit SHA.

The deploy workflow:

1. Runs manually from GitHub Actions with an `image_tag` input such as `latest` or a specific commit SHA.
2. SSHes into the droplet.
3. Pulls the selected app image.
4. Restarts the application stack with the selected runtime image.
5. Lets the app container apply pending migrations before it starts serving traffic.

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

## port

1. Dev
    Postgres → localhost:5432
    MinIO → localhost:9000
    Next → pnpm dev
2. Prod
    Postgres → localhost:5434
    MinIO → localhost:9100
    Next → localhost:3022
