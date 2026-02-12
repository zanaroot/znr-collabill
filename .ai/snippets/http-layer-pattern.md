# HTTP Layer Pattern

## Model (Zod schemas + inferred types)

Single source of truth for input shapes and shared types. Importable from actions, controllers, middleware, and client components.

```typescript
// http/models/task.model.ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  projectId: z.string().uuid(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "VALIDATED"]).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

Shared types that apply across domains live in `auth.model.ts`:

```typescript
// http/models/auth.model.ts
export type ActionResponse = {
  message?: string;
  error?: string;
  success: boolean;
};

export type AuthUser = { id: string; email: string; name: string };

export type AuthEnv = {
  Variables: { user: AuthUser };
};
```

## Controller (Hono endpoint handler)

Export individual handler functions, not objects. Use `AuthEnv` from models for typed context.

```typescript
// http/controllers/task.controller.ts
import type { AuthEnv } from "@/http/models/auth.model";
import { createFactory } from "hono/factory";

const factory = createFactory<AuthEnv>();

export const getByProject = factory.createHandlers(async (c) => {
  const projectId = c.req.param("projectId");
  const user = c.get("user");
  // call repository or action...
  return c.json(tasks);
});
```

## Action (Server Action — imports schema from model)

```typescript
// http/actions/task.action.ts
"use server";

import type { ActionResponse } from "@/http/models/auth.model";
import { createTaskSchema } from "@/http/models/task.model";
import type { CreateTaskInput } from "@/http/models/task.model";
import { insertTask } from "@/http/repositories/task.repository";

export const createTaskAction = async (
  input: CreateTaskInput,
): Promise<ActionResponse> => {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input", success: false };
  await insertTask(parsed.data);
  return { message: "Task created", success: true };
};
```

## Middleware (Hono middleware)

```typescript
// http/middleware/auth.middleware.ts
import type { AuthEnv } from "@/http/models/auth.model";
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // validate session, inject user into context
  c.set("user", user);
  await next();
});
```

## Repository (data access only)

No cookies, no business logic, no infrastructure concerns.

```typescript
// http/repositories/task.repository.ts
"server only";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const findTasksByProject = async (projectId: string) => {
  return db.select().from(tasks).where(eq(tasks.projectId, projectId));
};
```

## Route (wires middleware + controllers)

```typescript
// http/routes/task.route.ts
import { Hono } from "hono";
import { getByProject, create } from "@/http/controllers/task.controller";

export const taskRoutes = new Hono()
  .get("/:projectId", ...getByProject)
  .post("/", ...create);
```

## Route index (mounts everything)

```typescript
// http/routes/index.ts
import { Hono } from "hono";
import { authMiddleware } from "@/http/middleware/auth.middleware";
import { taskRoutes } from "./task.route";

export const app = new Hono()
  .basePath("/api")
  .use("*", authMiddleware)
  .route("/tasks", taskRoutes);

export type AppType = typeof app;
```

## Server-only query (for Server Components)

Not a Server Action — used directly in Server Components/layouts.

```typescript
// http/actions/get-current-user.ts
"server only";

import { findValidSessionByToken } from "@/http/repositories/session.repository";
import { cookies } from "next/headers";

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  const result = await findValidSessionByToken(token);
  return result?.user ?? null;
};
```
