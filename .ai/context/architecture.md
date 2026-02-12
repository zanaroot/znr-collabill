# Architecture

## Overview

Single Next.js application with server-rendered pages, server actions, and a Hono-based API mounted under `/api`.

## Main modules

- `app/`: UI routes and layouts using App Router.
  - Public/auth screens in `app/(auth)/...`.
  - Protected screens in `app/(private)/...` with session checks.
  - API bridge in `app/api/[[...route]]/route.ts`.
- `http/`: backend orchestration.
  - Models: Zod schemas and inferred types (`http/models/`).
  - Controllers: Hono handlers using `createFactory` (`http/controllers/`).
  - Actions: Server Actions and server-only queries (`http/actions/`).
  - Middleware: Hono middleware for auth and request processing (`http/middleware/`).
  - Repositories: Drizzle data-access layer (`http/repositories/`).
  - Routes: Hono route files wiring controllers and middleware (`http/routes/`).
- `db/`: Drizzle setup and PostgreSQL schema.
  - Tables/enums in `db/schema/schema.ts`.
  - Connection and env loading in `db/index.ts`.
- `lib/`: pure utility functions, usable on client and server. No DB or server-only imports.
- `packages/`: configured third-party library wrappers.
  - `packages/hono/`: typed Hono client (`hc<AppType>`).
  - `packages/react-query/`: React Query provider + client config.
  - `packages/antd/`: Ant Design provider + theme config.

## Layer responsibilities

| Layer | Path | Role | Depends on |
|-------|------|------|------------|
| **Models** | `http/models/` | Zod schemas + `z.infer` types. Single source of truth for input/output shapes and shared types (`AuthUser`, `ActionResponse`). | `zod` |
| **Controllers** | `http/controllers/` | Hono endpoint handlers (`createFactory`). Read context, call actions/repositories, return JSON. | Models, Actions, Repositories |
| **Actions** | `http/actions/` | Server Actions (`"use server"`) + server-only queries. Import schemas from models for validation. Entry point for client components and Server Components. | Models, Repositories |
| **Middleware** | `http/middleware/` | Hono middleware (`createMiddleware`). Auth validation, request enrichment. Injects data into Hono context. | Models, Repositories |
| **Repositories** | `http/repositories/` | Data access only. Drizzle queries, no business logic, no cookies, no infrastructure. | `db/` |
| **Lib** | `lib/` | Pure utilities. No DB, no server-only imports. Client + server safe. | Nothing |
| **Packages** | `packages/` | Configured instances of third-party libraries (Hono client, React Query provider, Antd provider/theme). | External deps |

## Data and auth flow

1. User authenticates via server actions in `http/actions/auth.action.ts`.
2. Session token is stored in `sessions` table and `session_token` cookie.
3. `middleware.ts` (Next.js) gates protected pages; `http/middleware/auth.middleware.ts` (Hono) gates API routes.
4. `http/actions/get-current-user.ts` reads cookies and validates session for Server Components.
5. Features (task board, invitations, password reset) read/write via Drizzle repositories.
