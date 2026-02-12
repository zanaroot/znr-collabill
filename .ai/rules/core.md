# Core Rules (Shared)

- Start from evidence in code/config, not assumptions.
- Keep changes minimal and directly reviewable.
- Be explicit about risks to auth, DB migrations, and routing.
- Do not touch secrets or print env values.
- Avoid destructive operations without explicit confirmation.

## Repo anchors

- App routes/layouts: `app/`
- HTTP layer: `http/controllers`, `http/routes`, `http/repositories`
- DB schema: `db/schema/`
- DB migrations: `db/migration/`
