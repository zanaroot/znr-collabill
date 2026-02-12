# Commands

## Install

```bash
pnpm install
```

## Run locally

```bash
docker compose up -d
pnpm dev
```

## Build and serve

```bash
pnpm build
pnpm start
```

## Quality checks

```bash
pnpm lint          # biome check
pnpm lint:fix      # biome auto-fix (formatting + lint)
pnpm format        # biome format only
pnpm build
```

Note: no dedicated `test` script is defined in `package.json`.

## Database workflows

```bash
pnpm drizzle:generate
pnpm drizzle:push
pnpm drizzle:migrate
pnpm drizzle:pull
```

## Utility script

```bash
pnpm create:user
```

The script in `http/scripts/create-user.ts` expects: email, name, password, and role (`OWNER` or `COLLABORATOR`).
