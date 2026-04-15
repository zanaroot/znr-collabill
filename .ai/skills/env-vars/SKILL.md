---
name: env-vars
description: Use when adding, removing, or changing environment variables in this repository. Covers validation, examples, production deploy wiring, Docker build args for public vars, and CI validation env updates.
---

# Env Vars

Use this checklist when adding or changing an environment variable.

## 1. Classify the variable

- `NEXT_PUBLIC_*`: public build-time value exposed to the client bundle.
- Server runtime variable: private or server-only value loaded at runtime.
- Validation support value: needed so CI `lint` / `typecheck` / `test` jobs can run.

## 2. Update env validation

- Public vars: update [packages/env/shared.ts](../../../packages/env/shared.ts) `publicEnvSchema` and the source mapping in [packages/env/index.ts](../../../packages/env/index.ts).
- Server vars: update [packages/env/shared.ts](../../../packages/env/shared.ts) `serverEnvSchema` and the source mapping in [packages/env/server.ts](../../../packages/env/server.ts).

## 3. Update local examples

- Add the variable to [.env.example](../../../.env.example).
- Keep the section aligned with how the variable is used:
  - build-time public var
  - runtime secret
  - runtime non-secret

## 4. Update production deploy wiring

- Runtime vars and secrets: update the generated env payload in [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml).
- Public build-time vars: update the Docker build args in the `build` job in [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml).
- Runtime container env: update [docker-compose.prod.yml](../../../docker-compose.prod.yml) when the app or another service needs the variable at runtime.

## 5. Update validation and build wiring

- If CI jobs need the variable, add a safe value in the `validate` job env block in [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml).
- Only touch [Dockerfile](../../../Dockerfile) when the build itself genuinely needs a new build arg or env.

## 6. Update docs

- Add the variable to [README.md](../../../README.md) in the correct section.
- If the variable changes deployment behavior, update the production deployment notes too.

## 7. Verify

- Run `pnpm lint`.
- Run `pnpm typecheck` when the change touches env typing or imports.
- For deploy changes, confirm the generated server `.env` will contain the new key.

## Common misses

- Forgetting `.env.example`
- Forgetting the `validate` job env block
- Adding a `NEXT_PUBLIC_*` key to runtime config but not to Docker build args
- Updating schema validation but not `packages/env/index.ts` or `packages/env/server.ts`
- Updating deploy payload but not `docker-compose.prod.yml`
