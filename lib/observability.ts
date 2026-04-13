import * as Sentry from "@sentry/nextjs";

export const setSentryUser = (user: {
  id: string;
  email?: string | null;
  name?: string | null;
}) => {
  // Par défaut on évite l’email dans Sentry (PII). Tu peux l’activer explicitement plus tard si besoin.
  Sentry.setUser({ id: user.id, username: user.name ?? undefined });
};

export const clearSentryUser = () => {
  Sentry.setUser(null);
};

export const captureException = (
  error: unknown,
  context?: Parameters<typeof Sentry.captureException>[1],
) => {
  Sentry.captureException(error, context);
};

export const captureMessage = (
  message: string,
  context?: Parameters<typeof Sentry.captureMessage>[1],
) => {
  Sentry.captureMessage(message, context);
};
