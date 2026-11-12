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
- `NEXT_PUBLIC_S3_ENDPOINT`: Browser-facing storage endpoint. Defaults to the
  app's `/api/storage` proxy route so browsers never contact MinIO directly.

### Runtime (provided at container start)

**Required Secrets:**
- `DATABASE_URL`: PostgreSQL connection string.
- `ENCRYPTION_KEY`: Required 32+ character key used by the app.
- `POSTGRES_PASSWORD`: Password for the Postgres database user.
- `MINIO_ROOT_PASSWORD`: Root password for the MinIO container.
- `S3_SECRET_KEY`: Secret key for S3/MinIO access.
- `BREVO_API_KEY`: API key for Brevo (or another email provider) to send emails.
- `LIVEKIT_API_KEY`: LiveKit Cloud (or self-hosted LiveKit) API key used to mint short-lived room tokens. Optional; audio/video calling and meetings return `503` until configured.
- `LIVEKIT_API_SECRET`: LiveKit API secret used to sign tokens and verify webhooks. Optional.
- `PAYMENT_WEBHOOK_SECRET`: Secret used to sign and verify payment webhooks (`X-Payment-Signature`, `sha256=<hex>` HMAC-SHA256 over the raw body). Optional; checkout, payment status reconciliation, and webhook processing return `503` until configured.
- `NOWPAYMENTS_API_KEY`: NOWPayments API key used to create payments. Required when `PAYMENT_PROVIDER=nowpayments`.
- `NOWPAYMENTS_IPN_SECRET`: NOWPayments IPN secret key used to verify `x-nowpayments-sig` (HMAC-SHA512 over the key-sorted JSON payload). Required when `PAYMENT_PROVIDER=nowpayments`.

**Required Variables:**
- `POSTGRES_DB`: Database name.
- `POSTGRES_USER`: Database user.
- `MINIO_ROOT_USER`: MinIO root username.
- `S3_ACCESS_KEY`: Access key for S3/MinIO.
- `S3_BUCKET`: S3 bucket name.
- `S3_REGION`: S3 region.
- `S3_ENDPOINT`: Server-side S3/MinIO endpoint (never exposed to the browser).
- `MAIL_FROM`: The "From" address for outgoing emails.
- `LIVEKIT_URL`: LiveKit server URL (e.g. `wss://your-project.livekit.cloud`) used by browsers and the server SDK. Optional.
- `PAYMENT_PROVIDER`: Payment provider id. Optional; defaults to `mock`. Supported values: `mock`, `nowpayments`. The mock provider is disabled when `NODE_ENV=production`, so production must use `nowpayments` (or another real provider) to accept payments.
- `NOWPAYMENTS_BASE_URL`: NOWPayments API base URL. Optional; defaults to `https://api.nowpayments.io/v1`. Use `https://api-sandbox.nowpayments.io/v1` with sandbox credentials for testing.

**Development Seeds (optional):**
- `SEED_OWNER_EMAIL`, `SEED_COLLABORATOR_EMAIL`, `SEED_PASSWORD`: Optional seed overrides for `pnpm db:seed` and `pnpm db:seed:dev`.

### Payment provider (local development)

Billing uses a provider abstraction in `packages/payment`. The bundled `mock`
provider implements the full lifecycle without external services:

1. Configure the webhook secret locally:

   ```bash
   pnpm env:set -- PAYMENT_WEBHOOK_SECRET "local-dev-secret"
   pnpm env:set -- PAYMENT_PROVIDER "mock"   # default value
   ```

2. Start the app (`pnpm dev`) and sign in as the seeded owner.
3. Start a checkout from billing. The response contains a `checkoutUrl`
   pointing at `/api/payments/mock/checkout/<checkoutId>`.
4. Open the mock checkout page and choose **Pay successfully** or **Fail
   payment**. The page posts the outcome to the same route, which signs and
   processes the provider event exactly like a real webhook; a succeeded
   payment moves the subscription to `ACTIVE` with a fresh billing period.
   `POST /api/payments/mock/checkout/<checkoutId>/refund` refunds a succeeded
   payment. The mock pages return `404` outside development.
5. Signed webhooks arrive at `POST /api/webhooks/payments` with the
   `X-Payment-Signature` header. To replay one manually:

   ```bash
   BODY='{"eventId":"evt_demo","type":"payment.succeeded","providerPaymentId":"<checkoutId>","amountMinor":1900,"currency":"USD","organizationId":"<orgId>","failureReason":null,"occurredAt":"2026-01-02T00:00:00.000Z"}'
   SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "local-dev-secret" -hex | awk '{print $NF}')"
   curl -sS -X POST http://localhost:3000/api/webhooks/payments \
     -H "X-Payment-Signature: $SIG" -H "Content-Type: application/json" -d "$BODY"
   ```

6. `GET /api/billing/payments/<paymentId>/status` (owner only) reconciles a
   payment against the provider and applies verified transitions; it never
   trusts the browser redirect. Duplicate and out-of-order events are
   recorded once and cannot regress a settled payment.

Real-provider work for additional providers (recurring renewals, refunds for
providers without a refund API) starts by implementing the `PaymentProvider`
interface in `packages/payment` and extending `PAYMENT_PROVIDER` in
`packages/env/shared.ts`.

### NOWPayments (IPN webhook)

CollaBill creates NOWPayments payments through `POST <NOWPAYMENTS_BASE_URL>/payment`
and receives status updates via an IPN (Instant Payment Notification) webhook.

#### Environment variables

```bash
pnpm env:set -- PAYMENT_PROVIDER "nowpayments"
pnpm env:set -- NOWPAYMENTS_API_KEY "<api-key>"
pnpm env:set -- NOWPAYMENTS_IPN_SECRET "<ipn-secret>"
pnpm env:set -- NOWPAYMENTS_BASE_URL "https://api.nowpayments.io/v1"   # optional, this is the default
pnpm env:set -- PAYMENT_WEBHOOK_SECRET "<webhook-secret>"              # still required by the provider gate
```

When `PAYMENT_PROVIDER=nowpayments`, the server refuses to boot without
`NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` (validated in
`packages/env/shared.ts`), and in production `NEXT_PUBLIC_APP_URL` must be an
`https://` URL (localhost is exempt for local builds) so the IPN callback URL
is always HTTPS in production.

#### NOWPayments dashboard configuration

1. In the NOWPayments dashboard, generate an **API key** (Payment Settings) and
   store it as `NOWPAYMENTS_API_KEY`.
2. Generate the **IPN secret key** in the Payment Settings tab and store it as
   `NOWPAYMENTS_IPN_SECRET`. Webhooks are not sent at all if this key is
   missing, and signature verification fails if it does not match the value
   configured in CollaBill. Sandbox and production secrets are separate — never
   mix them.
3. The callback URL is passed automatically on every payment creation as
   `ipn_callback_url`, built from `NEXT_PUBLIC_APP_URL`:

   ```
   https://<your-domain>/api/payments/nowpayments/webhook
   ```

   You do not need to hardcode the domain anywhere; for local development it
   becomes `http://localhost:3000/api/payments/nowpayments/webhook`, which
   NOWPayments cannot reach (no localhost callbacks) — see local testing below.
4. Ensure your firewall allows NOWPayments notification IPs
   (`51.89.194.21`, `51.75.77.69`, `138.201.172.58`, `65.21.158.36`) and that
   the endpoint responds within 3000 ms.

#### Status mapping

| NOWPayments status | CollaBill effect |
| --- | --- |
| `waiting`, `confirming`, `confirmed`, `sending` | Acknowledged (`200`), payment stays `PENDING` |
| `partially_paid` | Acknowledged (`200`), payment stays `PENDING` — a partial payment is never marked as paid |
| `finished` | Payment → `SUCCEEDED`, subscription activated (only `finished` marks a payment as paid) |
| `failed` | Payment → `FAILED` with failure reason `failed` |
| `expired` | Payment → `FAILED` with failure reason `expired` (unblocks a new checkout) |
| `refunded` | Payment → `REFUNDED` |

Notifications are idempotent: each `payment_id` + `payment_status` pair is
recorded once (`nowpayments:<payment_id>:<status>`), so retries and replays
return `200` without reprocessing. Signature verification happens before any
database access; invalid or missing signatures return `401`, malformed payloads
`400`, unknown payment references `404` (so NOWPayments can retry), and
unexpected failures `500`.

#### Testing the webhook locally

NOWPayments cannot deliver IPNs to localhost. Two options:

**1. Replay a signed IPN yourself** (no real transaction). With
`NOWPAYMENTS_IPN_SECRET` set locally, craft a payload whose `order_id` is the
UUID of a `PENDING` nowpayments payment in your database and `payment_id` is
that payment's provider id, then sign it:

```bash
BODY='{"payment_id":123456789,"payment_status":"finished","price_amount":19,"price_currency":"usd","order_id":"<payment-uuid>","updated_at":"2026-01-02T00:00:00.000Z"}'
SIG="$(node -e '
const { createHmac } = require("crypto");
const sort = (v) => Array.isArray(v) ? v.map(sort)
  : (v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]))
      : v);
process.stdout.write(
  createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(sort(JSON.parse(process.argv[1]))))
    .digest("hex"),
);
' "$BODY")"
curl -sS -X POST http://localhost:3000/api/payments/nowpayments/webhook \
  -H "x-nowpayments-sig: $SIG" \
  -H "Content-Type: application/json" \
  -d "$BODY"
```

Expected responses: `200` with `{"received":true,"outcome":"processed"}` for a
valid `finished` IPN, `401` when the signature is missing or wrong, `400` for
a malformed payload, `404` for an unknown payment reference.

**2. Receive real IPNs through a tunnel** — start `ngrok http 3000` (or
equivalent), point `NEXT_PUBLIC_APP_URL` at the tunnel URL, and use the NOWPayments
**sandbox** (`NOWPAYMENTS_BASE_URL=https://api-sandbox.nowpayments.io/v1` with
sandbox API key + sandbox IPN secret). Create a checkout; status changes on the
sandbox payment are delivered to the tunnelled
`/api/payments/nowpayments/webhook` endpoint.

### Adding a new env var

When adding or changing an environment variable, update all relevant wiring in the same change:

1. Decide whether it is a public build-time var (`NEXT_PUBLIC_*`) or a runtime server var.
2. Update validation in `packages/env/shared.ts` plus the matching source mapping in `packages/env/index.ts` or `packages/env/server.ts`.
3. Add it to `.env.example`.
4. If production uses it at runtime, add it to `docker-compose.prod.yml`.
5. If production deploy generates it, add it to the env payload in `.github/workflows/deploy.yml`.
6. If CI validation jobs need it, add a safe value to the `validate` job env block in `.github/workflows/deploy.yml`.
7. If it is a public build-time var, add it to the Docker build args in `.github/workflows/deploy.yml`.
8. Only update `Dockerfile` when the build itself truly needs a new build arg or env.
9. Update this README if the variable changes setup or deployment expectations.

Common misses are `.env.example`, the `validate` job env block, and public vars that were added to runtime config but not to Docker build args.

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

Production deployment is handled entirely through GitHub Actions. The workflow SSHs into the VPS, pulls the latest application code directly from Git, generates the `.env` file from GitHub Environment secrets and variables, and rebuilds the Docker stack on the server.

### GitHub Environment Setup

1. Go to **Settings > Environments** and create a `production` environment
2. Add **Environment Secrets** (sensitive values):
   - `DATABASE_URL`
   - `POSTGRES_PASSWORD`
   - `MINIO_ROOT_PASSWORD`
   - `S3_SECRET_KEY`
   - `ENCRYPTION_KEY`
   - `BREVO_API_KEY`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
   - `NOWPAYMENTS_API_KEY` (required when `PAYMENT_PROVIDER=nowpayments`)
   - `NOWPAYMENTS_IPN_SECRET` (required when `PAYMENT_PROVIDER=nowpayments`)
   - `DROPLET_HOST`
   - `DROPLET_USER`
   - `DROPLET_SSH_KEY`

3. Add **Environment Variables** (non-sensitive):
   - `NEXT_PUBLIC_APP_URL` (e.g., `https://collabill.tchi.xyz`)
   - `NEXT_PUBLIC_S3_ENDPOINT` (e.g., `/api/storage` — must stay the proxy
     route; the real MinIO/S3 endpoint is never exposed via a `NEXT_PUBLIC_*` var)
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `MINIO_ROOT_USER`
   - `S3_ACCESS_KEY`
   - `S3_BUCKET`
   - `S3_REGION`
   - `S3_ENDPOINT`
   - `MAIL_FROM`
   - `LIVEKIT_URL` (e.g. `wss://your-project.livekit.cloud`)
   - `PAYMENT_PROVIDER` (e.g. `nowpayments` in production)
   - `NOWPAYMENTS_BASE_URL` (defaults to `https://api.nowpayments.io/v1` when unset)

### Deploy

1. Go to **Actions > Deploy**
2. Click **Run workflow**
3. Select the `production` environment (override `deploy_path` or `branch` only if needed)
4. The workflow will:
   - SSH to the VPS using `DROPLET_SSH_KEY`
   - `git fetch --all && git reset --hard origin/<branch>` inside the deploy path (clones the repository on first run)
   - Write `<deploy_path>/.env` from GitHub-managed secrets/vars with `chmod 600`
   - `docker compose -p collabill-prod down --remove-orphans`
   - `docker compose -p collabill-prod build --no-cache`
   - `docker compose -p collabill-prod up -d --remove-orphans`
   - Stop on the first failing step (`set -Eeuo pipefail` + `script_stop: true`)

### Server Prerequisites

The deploy user on the VPS must be able to:

- Authenticate to GitHub over SSH for the target repository (a read-only deploy key added in the repo's **Deploy keys** settings is the recommended approach; ensure `github.com` is in `~/.ssh/known_hosts`).
- Run `docker compose` without interactive prompts (add the deploy user to the `docker` group or run the workflow with `sudo` capabilities).

By default the application lives at `/app` on the server; override the path via the `deploy_path` workflow input when running the action.

### Check logs:

```bash
ssh <user>@<host>
cd /app
docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env logs -f next
docker compose -p collabill-prod -f docker-compose.prod.yml --env-file .env logs -f nginx
```

### TLS Setup

The repo ships with:

- `nginx/conf.d/app.conf`: active HTTP-only config used for first boot and Let's Encrypt webroot validation
- `nginx/https.conf.example`: HTTPS config template to activate after the certificate is issued

On the server:

```bash
cd /app

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
- `postgres` and `minio` are internal-only in production. Browser file/avatar access goes through the app's `/api/storage` proxy, which forwards to `S3_ENDPOINT` server-side.

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
