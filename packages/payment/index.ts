"server only";

import { serverEnv } from "@/packages/env/server";
import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export { MockPaymentProvider } from "./mock";
export type {
  PaymentCheckoutSession,
  PaymentProvider,
  PaymentProviderStatus,
  PaymentStatusSnapshot,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
} from "./types";

export const getPaymentProvider = (): PaymentProvider | null => {
  const webhookSecret = serverEnv.PAYMENT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return null;
  }

  if (serverEnv.PAYMENT_PROVIDER === "mock") {
    if (serverEnv.NODE_ENV === "production") {
      return null;
    }
    return new MockPaymentProvider({
      webhookSecret,
      appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    });
  }

  return null;
};

export const getMockPaymentProvider = (): MockPaymentProvider | null => {
  const provider = getPaymentProvider();
  return provider instanceof MockPaymentProvider ? provider : null;
};
