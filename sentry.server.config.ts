// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

  beforeSend(event) {
    const request = event.request
      ? { ...event.request, cookies: undefined, headers: undefined }
      : undefined;
    return { ...event, request };
  },
});
