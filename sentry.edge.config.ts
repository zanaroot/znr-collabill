// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { publicEnv } from "@/packages/env";
import { serverEnv } from "@/packages/env/server";

Sentry.init({
  dsn: serverEnv.SENTRY_DSN ?? publicEnv.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  enabled: Boolean(serverEnv.SENTRY_DSN ?? publicEnv.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Par défaut on évite d’envoyer des PII (cookies, headers, etc.)
  sendDefaultPii: false,
});
