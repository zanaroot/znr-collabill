import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";

type RateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
  keyBy?: "user" | "ip";
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

const pruneBuckets = (now: number) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const resolveKey = (c: Context, options: RateLimitOptions): string => {
  if (options.keyBy === "ip") {
    const forwarded = c.req.header("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    return `${options.name}:${ip}`;
  }

  const user = c.get("user");
  return `${options.name}:${user?.id ?? "anonymous"}`;
};

export const rateLimit = (options: RateLimitOptions) =>
  createMiddleware<AuthEnv>(async (c: Context, next: Next) => {
    const now = Date.now();
    const key = resolveKey(c, options);

    if (buckets.size >= MAX_BUCKETS) {
      pruneBuckets(now);
    }

    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (bucket.count >= options.limit) {
      return c.json({ error: "Too many requests" }, 429);
    }

    bucket.count += 1;
    await next();
  });

export const resetRateLimitsForTests = () => {
  buckets.clear();
};
