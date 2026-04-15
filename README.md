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

### Build-time (baked into the image)

- `NEXT_PUBLIC_APP_URL`: Public app base URL used in client-side code.
- `NEXT_PUBLIC_S3_ENDPOINT`: Public S3/MinIO endpoint for browser access.

### Runtime (provided at container start)

**Required Secrets:**
- `DATABASE_URL`: PostgreSQL connection string.
- `ENCRYPTION_KEY`: Required 32+ character key used by the app.
- `POSTGRES_PASSWORD`: Password for the Postgres database user.
- `MINIO_ROOT_PASSWORD`: Root password for the MinIO container.
- `S3_SECRET_KEY`: Secret key for S3/MinIO access.
- `BREVO_API_KEY`: API key for Brevo (or another email provider) to send emails.

**Required Variables:**
- `POSTGRES_DB`: Database name.
- `POSTGRES_USER`: Database user.
- `MINIO_ROOT_USER`: MinIO root username.
- `S3_ACCESS_KEY`: Access key for S3/MinIO.
- `S3_BUCKET`: S3 bucket name.
- `S3_REGION`: S3 region.
- `S3_ENDPOINT`: Server-side S3/MinIO endpoint.
- `MAIL_FROM`: The "From" address for outgoing emails.

**Development Seeds (optional):**
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

Production deployment is handled entirely through GitHub Actions. The workflow builds the image, pushes it to GHCR, and deploys to the VPS with the generated `.env` file.

### GitHub Environment Setup

1. Go to **Settings > Environments** and create a `production` environment
2. Add **Environment Secrets** (sensitive values):
   - `DATABASE_URL`
   - `POSTGRES_PASSWORD`
   - `MINIO_ROOT_PASSWORD`
   - `S3_SECRET_KEY`
   - `ENCRYPTION_KEY`
   - `BREVO_API_KEY`
   - `GHCR_USERNAME` (username used for image pull on VPS)
   - `GHCR_READ_TOKEN` (token with `read:packages` scope)
   - `DROPLET_HOST`
   - `DROPLET_USER`
   - `DROPLET_SSH_KEY`

3. Add **Environment Variables** (non-sensitive):
   - `NEXT_PUBLIC_APP_URL` (e.g., `https://collabill.tchi.xyz`)
   - `NEXT_PUBLIC_S3_ENDPOINT` (e.g., `https://files.collabill.tchi.xyz`)
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `MINIO_ROOT_USER`
   - `S3_ACCESS_KEY`
   - `S3_BUCKET`
   - `S3_REGION`
   - `S3_ENDPOINT`
   - `MAIL_FROM`

### Deploy

1. Go to **Actions > Build and Deploy**
2. Click **Run workflow**
3. Select the `production` environment
4. The workflow will:
   - Run lint, typecheck, and unit tests
   - Build the Docker image with build-time env vars
   - Push to GHCR with both the commit SHA and `latest` tags
   - SSH to the VPS
   - Generate `/var/docker-infra/.env` from GitHub-managed secrets/vars
   - Pull the new image and restart the stack
   - Prune old images

### Initial Server Setup

For first-time setup on a new VPS, copy the compose file and nginx config:

```bash
# On your local machine
scp -r docker-compose.prod.yml nginx <user>@<host>:/var/docker-infra/
```

Then run the GitHub Actions deploy workflow. The workflow will generate the `.env` file automatically.

### Check logs:
- `docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env logs -f next`
- `docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env logs -f nginx`

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

### Important Notes

- `.env.example` is set up for local development, so its default `DATABASE_URL` uses `localhost`. If `.env` runs against the bundled `postgres` container, set `DATABASE_URL` to `postgresql://user:password@postgres:5432/collabill_db` or provide matching `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values.
- The deploy workflow generates `/var/docker-infra/.env` on the VPS from GitHub-managed secrets and vars. This file has restrictive permissions (`chmod 600`) and contains the runtime configuration.
- Secrets are **not** baked into the Docker image. Only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_S3_ENDPOINT` are build-time values.
- If you use the bundled `postgres` service with a persisted volume, changing `POSTGRES_PASSWORD` later does not rotate the existing database user's password. In that case, update `DATABASE_URL` to the real live credential or rotate the Postgres role password manually before rerunning migrations.
- `next` is no longer exposed on public port `3000`; `nginx` is the public entrypoint on `80/443`.
- `postgres` and `minio` are internal-only in production. Public file access should go through `https://files.collabill.tchi.xyz`.

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

## Port Mapping

1. Dev
    - Postgres → localhost:5432
    - MinIO → localhost:9000
    - Next → pnpm dev
2. Prod
    - Postgres → localhost:5434
    - MinIO → localhost:9100
    - Next → localhost:3022
