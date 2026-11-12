"server only";

import { serverEnv } from "@/packages/env/server";
import { MockPaymentProvider } from "./mock";
import { NowPaymentsProvider } from "./nowpayments";
import type { PaymentProvider } from "./types";

export { MockPaymentProvider } from "./mock";
export {
  buildNowpaymentsIpnEvent,
  signNowpaymentsIpn,
  verifyNowpaymentsIpn,
} from "./nowpayments";
export type {
  PaymentCheckoutSession,
  PaymentProvider,
  PaymentProviderStatus,
  PaymentStatusSnapshot,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
} from "./types";

export const getPaymentProvider = (): PaymentProvider | null => {
  if (serverEnv.PAYMENT_PROVIDER === "mock") {
    const webhookSecret = serverEnv.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return null;
    }
    if (serverEnv.NODE_ENV === "production") {
      return null;
    }
    return new MockPaymentProvider({
      webhookSecret,
      appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    });
  }

  if (serverEnv.PAYMENT_PROVIDER === "nowpayments") {
    const apiKey = serverEnv.NOWPAYMENTS_API_KEY;
    const ipnSecret = serverEnv.NOWPAYMENTS_IPN_SECRET;
    if (!apiKey || !ipnSecret) {
      return null;
    }
    return new NowPaymentsProvider({
      apiKey,
      ipnSecret,
      baseUrl:
        serverEnv.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1",
      appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
    });
  }

  return null;
};

export const getMockPaymentProvider = (): MockPaymentProvider | null => {
  const provider = getPaymentProvider();
  return provider instanceof MockPaymentProvider ? provider : null;
};
