"server only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type {
  CreateCheckoutSessionInput,
  PaymentCheckoutSession,
  PaymentProvider,
  PaymentProviderStatus,
  PaymentStatusSnapshot,
  PaymentWebhookEvent,
  PaymentWebhookEventType,
  WebhookVerification,
} from "./types";

const nowpaymentsIpnStatuses = [
  "waiting",
  "confirming",
  "confirmed",
  "sending",
  "partially_paid",
  "finished",
  "failed",
  "refunded",
  "expired",
] as const;

type NowpaymentsIpnStatus = (typeof nowpaymentsIpnStatuses)[number];

const nowpaymentsIpnStatusSchema = z.enum(nowpaymentsIpnStatuses);

const nowpaymentsIpnPayloadSchema = z.object({
  payment_id: z.union([z.string().min(1), z.number()]),
  payment_status: nowpaymentsIpnStatusSchema,
  price_amount: z.coerce.number().nonnegative(),
  price_currency: z.string().trim().min(1),
  order_id: z.string().min(1).nullish(),
  updated_at: z.string().nullish(),
  created_at: z.string().nullish(),
});

export type NowpaymentsIpnPayload = {
  paymentId: string;
  status: NowpaymentsIpnStatus;
  priceAmountMinor: number;
  priceCurrency: string;
  orderId: string | null;
  occurredAt: string;
};

export type NowpaymentsIpnVerification =
  | { ok: true; payload: NowpaymentsIpnPayload }
  | {
      ok: false;
      reason: "missing_signature" | "invalid_signature" | "malformed_payload";
    };

const ipnEventTypeByStatus: Partial<
  Record<NowpaymentsIpnStatus, PaymentWebhookEventType>
> = {
  finished: "payment.succeeded",
  failed: "payment.failed",
  expired: "payment.failed",
  refunded: "payment.refunded",
};

const paymentStatusByIpnStatus: Record<
  NowpaymentsIpnStatus,
  PaymentProviderStatus
> = {
  waiting: "PENDING",
  confirming: "PENDING",
  confirmed: "PENDING",
  sending: "PENDING",
  partially_paid: "PENDING",
  finished: "SUCCEEDED",
  failed: "FAILED",
  refunded: "REFUNDED",
  expired: "FAILED",
};

const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortObjectKeys(record[key])]),
    );
  }
  return value;
};

export const signNowpaymentsIpn = (payload: unknown, secret: string): string =>
  createHmac("sha512", secret)
    .update(JSON.stringify(sortObjectKeys(payload)))
    .digest("hex");

export const verifyNowpaymentsIpn = (
  rawBody: string,
  signature: string | null,
  secret: string,
): NowpaymentsIpnVerification => {
  if (!signature) {
    return { ok: false, reason: "missing_signature" };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, reason: "malformed_payload" };
  }

  const expected = Buffer.from(signNowpaymentsIpn(json, secret), "utf8");
  const received = Buffer.from(signature.trim(), "utf8");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return { ok: false, reason: "invalid_signature" };
  }

  const parsed = nowpaymentsIpnPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, reason: "malformed_payload" };
  }

  const data = parsed.data;
  return {
    ok: true,
    payload: {
      paymentId: String(data.payment_id),
      status: data.payment_status,
      priceAmountMinor: Math.round(data.price_amount * 100),
      priceCurrency: data.price_currency.toUpperCase(),
      orderId: data.order_id ?? null,
      occurredAt:
        data.updated_at ?? data.created_at ?? new Date().toISOString(),
    },
  };
};

export const buildNowpaymentsIpnEvent = (
  payload: NowpaymentsIpnPayload,
): PaymentWebhookEvent | null => {
  const type = ipnEventTypeByStatus[payload.status];
  if (!type) {
    return null;
  }
  return {
    eventId: `nowpayments:${payload.paymentId}:${payload.status}`,
    type,
    providerPaymentId: payload.paymentId,
    amountMinor: payload.priceAmountMinor,
    currency: payload.priceCurrency,
    organizationId: null,
    failureReason: type === "payment.failed" ? payload.status : null,
    occurredAt: payload.occurredAt,
  };
};

const createPaymentResponseSchema = z.object({
  payment_id: z.union([z.string().min(1), z.number()]),
  payment_url: z.string().min(1),
});

const paymentStatusResponseSchema = z.object({
  payment_id: z.union([z.string().min(1), z.number()]),
  payment_status: nowpaymentsIpnStatusSchema,
  price_amount: z.coerce.number().nonnegative(),
  price_currency: z.string().trim().min(1),
  updated_at: z.string().nullish(),
  created_at: z.string().nullish(),
});

export type NowPaymentsProviderConfig = {
  apiKey: string;
  ipnSecret: string;
  baseUrl: string;
  appUrl: string;
};

export class NowPaymentsProvider implements PaymentProvider {
  readonly name = "nowpayments";
  private readonly apiKey: string;
  private readonly ipnSecret: string;
  private readonly baseUrl: string;
  private readonly appUrl: string;

  constructor(config: NowPaymentsProviderConfig) {
    this.apiKey = config.apiKey;
    this.ipnSecret = config.ipnSecret;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.appUrl = config.appUrl.replace(/\/+$/, "");
  }

  private readonly ipnCallbackUrl = (): string =>
    `${this.appUrl}/api/payments/nowpayments/webhook`;

  createCheckoutSession = async (
    input: CreateCheckoutSessionInput,
  ): Promise<PaymentCheckoutSession> => {
    const response = await fetch(`${this.baseUrl}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: input.amountMinor / 100,
        price_currency: input.currency.toLowerCase(),
        ipn_callback_url: this.ipnCallbackUrl(),
        order_id: input.metadata.paymentId,
        order_description: `Plan ${input.metadata.planCode}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`NOWPayments create payment failed (${response.status})`);
    }

    const parsed = createPaymentResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(
        "NOWPayments create payment returned an invalid response",
      );
    }

    return {
      providerCheckoutId: String(parsed.data.payment_id),
      url: parsed.data.payment_url,
      expiresAt: null,
    };
  };

  retrievePayment = async (
    providerPaymentId: string,
  ): Promise<PaymentStatusSnapshot> => {
    const response = await fetch(
      `${this.baseUrl}/payment/${encodeURIComponent(providerPaymentId)}`,
      { headers: { "x-api-key": this.apiKey } },
    );

    if (!response.ok) {
      throw new Error(
        `NOWPayments retrieve payment failed (${response.status})`,
      );
    }

    const parsed = paymentStatusResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(
        "NOWPayments retrieve payment returned an invalid response",
      );
    }

    const data = parsed.data;
    const status = data.payment_status;
    return {
      providerPaymentId: String(data.payment_id),
      status: paymentStatusByIpnStatus[status],
      amountMinor: Math.round(data.price_amount * 100),
      currency: data.price_currency.toUpperCase(),
      failureReason:
        status === "failed" || status === "expired" ? status : null,
      occurredAt:
        data.updated_at ?? data.created_at ?? new Date().toISOString(),
    };
  };

  verifyWebhook = (
    rawBody: string,
    signature: string | null,
  ): WebhookVerification => {
    const verification = verifyNowpaymentsIpn(
      rawBody,
      signature,
      this.ipnSecret,
    );
    if (!verification.ok) {
      return { ok: false, reason: verification.reason };
    }
    return { ok: true, event: buildNowpaymentsIpnEvent(verification.payload) };
  };
}
