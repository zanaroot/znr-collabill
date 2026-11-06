import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logAudit: vi.fn(),
  listSubscriptionPaymentsAdmin: vi.fn(),
  findSubscriptionPaymentDetailAdmin: vi.fn(),
  processPaymentEvent: vi.fn(),
  getPaymentProvider: vi.fn(),
}));

vi.mock("@/http/actions/audit.action", () => ({
  logAudit: mocks.logAudit,
}));
vi.mock("@/http/repositories/payment.repository", () => ({
  findSubscriptionPaymentDetailAdmin: mocks.findSubscriptionPaymentDetailAdmin,
  listSubscriptionPaymentsAdmin: mocks.listSubscriptionPaymentsAdmin,
}));
vi.mock("@/http/services/payment-webhook.service", () => ({
  processPaymentEvent: mocks.processPaymentEvent,
}));
vi.mock("@/packages/payment", () => ({
  getPaymentProvider: mocks.getPaymentProvider,
}));
vi.mock("@/db", () => ({ db: {}, dbClient: {} }));

import {
  getPaymentForAdmin,
  listPaymentsForAdmin,
  refundPaymentAsAdmin,
} from "@/http/services/payment-admin.service";

const actorId = "00000000-0000-4000-8000-0000000000aa";
const paymentId = "66666666-6666-4666-8666-666666666666";
const organizationId = "11111111-1111-4111-8111-111111111111";

const basePayment = {
  id: paymentId,
  organizationId,
  subscriptionId: "22222222-2222-4222-8222-222222222222",
  planId: "33333333-3333-4333-8333-333333333331",
  status: "SUCCEEDED" as const,
  amountMinor: 1900,
  currency: "USD",
  provider: "mock",
  providerPaymentId: "cs_mock_1",
  paidAt: new Date("2026-01-01T00:00:00.000Z"),
  failureReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const buildDetail = (overrides: Record<string, unknown> = {}) => ({
  payment: { ...basePayment, ...(overrides.payment as object) },
  organization: { id: organizationId, name: "Acme" },
  plan: { id: basePayment.planId, code: "PRO", name: "Pro" },
  subscription: { id: basePayment.subscriptionId, status: "ACTIVE" },
  events: [],
});

const buildProvider = (overrides: Record<string, unknown> = {}) => ({
  name: "mock",
  createCheckoutSession: vi.fn(),
  retrievePayment: vi.fn(),
  verifyWebhook: vi.fn(),
  refundPayment: vi.fn().mockResolvedValue({
    providerRefundId: "rfnd_1",
    status: "SUCCEEDED",
  }),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logAudit.mockResolvedValue(undefined);
});

describe("listPaymentsForAdmin", () => {
  it("passes filters through to the repository", async () => {
    mocks.listSubscriptionPaymentsAdmin.mockResolvedValue({
      rows: [],
      total: 0,
    });

    const result = await listPaymentsForAdmin({
      status: "SUCCEEDED",
      page: 2,
      pageSize: 10,
    });

    expect(result).toEqual({ rows: [], total: 0 });
    expect(mocks.listSubscriptionPaymentsAdmin).toHaveBeenCalledWith({
      status: "SUCCEEDED",
      page: 2,
      pageSize: 10,
    });
  });
});

describe("getPaymentForAdmin", () => {
  it("returns 404 for unknown payments", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(null);

    await expect(getPaymentForAdmin(paymentId)).rejects.toMatchObject({
      name: "BackOfficeError",
      statusCode: 404,
    });
  });

  it("reports refund support for the configured provider", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(buildProvider());

    const result = await getPaymentForAdmin(paymentId);

    expect(result.refund).toEqual({ configured: true, supported: true });
  });

  it("reports unsupported refunds when the provider lacks refundPayment", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(
      buildProvider({ refundPayment: undefined }),
    );

    const result = await getPaymentForAdmin(paymentId);

    expect(result.refund).toEqual({ configured: true, supported: false });
  });

  it("reports an unconfigured provider", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(null);

    const result = await getPaymentForAdmin(paymentId);

    expect(result.refund).toEqual({ configured: false, supported: false });
  });
});

describe("refundPaymentAsAdmin", () => {
  it("returns 404 for unknown payments", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(null);

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects refunds for non-succeeded payments", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(
      buildDetail({ payment: { status: "PENDING" } }),
    );

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.getPaymentProvider).not.toHaveBeenCalled();
  });

  it("rejects refunds without a provider reference", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(
      buildDetail({ payment: { providerPaymentId: null } }),
    );

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("returns 503 when no provider is configured", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(null);

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("returns 400 when the provider does not support refunds", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(
      buildProvider({ refundPayment: undefined }),
    );

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 502 when the provider refund call fails", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(
      buildProvider({
        refundPayment: vi.fn().mockRejectedValue(new Error("declined")),
      }),
    );

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Provider refund failed: declined",
    });
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
  });

  it("returns 502 when the provider does not confirm the refund", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(
      buildProvider({
        refundPayment: vi.fn().mockResolvedValue({
          providerRefundId: "rfnd_1",
          status: "PENDING",
        }),
      }),
    );

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Provider did not confirm the refund",
    });
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("records the refund only after provider confirmation and audits it", async () => {
    const provider = buildProvider();
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(provider);
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "processed",
      payment: { ...basePayment, status: "REFUNDED" },
      subscription: null,
    });

    const result = await refundPaymentAsAdmin({ paymentId, actorId });

    expect(result.status).toBe("REFUNDED");
    expect(provider.refundPayment).toHaveBeenCalledWith("cs_mock_1", 1900);
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "rfnd_1",
        type: "payment.refunded",
        providerPaymentId: "cs_mock_1",
        amountMinor: 1900,
        organizationId,
      }),
      "mock",
    );
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId,
        actorId,
        action: "UPDATE",
        entity: "PAYMENT",
        entityId: paymentId,
        metadata: expect.objectContaining({ operation: "refund" }),
      }),
    );
  });

  it("does not mark the payment refunded when the event is not applied", async () => {
    mocks.findSubscriptionPaymentDetailAdmin.mockResolvedValue(buildDetail());
    mocks.getPaymentProvider.mockReturnValue(buildProvider());
    mocks.processPaymentEvent.mockResolvedValue({
      outcome: "ignored",
      reason: "out_of_order",
      payment: basePayment,
    });

    await expect(
      refundPaymentAsAdmin({ paymentId, actorId }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });
});
