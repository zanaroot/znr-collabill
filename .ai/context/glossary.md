# Glossary

- Collabill: Project name from `package.json` and app metadata.
- App Router: Next.js route/layout system used under `app/`.
- Hono: HTTP framework used in `http/routes/` and exposed via `app/api/[[...route]]/route.ts`.
- Drizzle ORM: Database toolkit used for schema, queries, and migrations (`db/`, `drizzle.config.ts`).
- Session token: `session_token` cookie value mapped to `sessions.token` in DB.
- Invitation: Tokenized onboarding record in `invitations` table.
- Password reset token: Expiring reset credential in `password_reset_tokens` table.
- Task statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `VALIDATED` from `task_status` enum.
- Roles: `OWNER` and `COLLABORATOR` from `role` enum.
