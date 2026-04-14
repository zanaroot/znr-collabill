import * as Sentry from "@sentry/nextjs";
import { publicEnv } from "@/packages/env";

Sentry.init({
  dsn: publicEnv.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(publicEnv.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  enableLogs: true,

  // Par défaut on évite d’envoyer des PII (cookies, headers, etc.)
  sendDefaultPii: false,

  // Replay est utile, mais coûteux: on l’active en prod uniquement.
  integrations:
    process.env.NODE_ENV === "production" ? [Sentry.replayIntegration()] : [],
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,

  beforeSend(event) {
    // Scrub basique côté client
    const request = event.request
      ? { ...event.request, cookies: undefined, headers: undefined }
      : undefined;
    return { ...event, request };
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
