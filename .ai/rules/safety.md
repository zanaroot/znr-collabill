# Safety

- Never commit secrets or `.env` values.
- Treat auth/session flows as high risk (`middleware.ts`, `http/controllers/sign-in.ts`, `http/repositories/users.repository.ts`).
- Treat schema/migration changes as high risk (`db/schema/*.ts`, `db/migration/*.sql`).
- When changing production-impacting code, define rollback guidance and verification commands.
- Avoid destructive DB operations unless explicitly requested.
