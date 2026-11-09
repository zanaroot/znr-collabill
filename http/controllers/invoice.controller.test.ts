import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, AuthUser } from "@/http/models/auth.model";
import { createInvoice, updateInvoiceStatus } from "./invoice.controller";

const mocks = vi.hoisted(() => ({
  findInvoiceById: vi.fn(),
  findInvoiceByPeriodAndUser: vi.fn(),
  findInvoicesByOrganizationId: vi.fn(),
  upsertInvoiceForPeriod: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoiceLines: vi.fn(),
  deleteInvoice: vi.fn(),
  getValidatedTaskIdsByPeriodAndUser: vi.fn(),
  getValidatedTaskIdsByPeriodAndReviewer: vi.fn(),
  unarchiveTasksByInvoice: vi.fn(),
  logAudit: vi.fn(),
  createNotification: vi.fn(),
  sendFinanceInvoiceNotification: vi.fn(() => Promise.resolve()),
  notifyInvoicePaidEmail: vi.fn(() => Promise.resolve()),
  notifyInvoiceValidatedEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/http/repositories/invoice.repository", () => mocks);
vi.mock("@/http/repositories/task.repository", () => ({
  getValidatedTaskIdsByPeriodAndReviewer:
    mocks.getValidatedTaskIdsByPeriodAndReviewer,
  getValidatedTaskIdsByPeriodAndUser: mocks.getValidatedTaskIdsByPeriodAndUser,
  unarchiveTasksByInvoice: mocks.unarchiveTasksByInvoice,
}));
vi.mock("@/http/actions/audit.action", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/http/repositories/notification.repository", () => ({
  createNotification: mocks.createNotification,
}));
vi.mock("@/lib/incoices/send-finance-invoice", () => ({
  sendFinanceInvoiceNotification: mocks.sendFinanceInvoiceNotification,
}));
vi.mock("@/lib/notifications", () => ({
  notifyInvoicePaidEmail: mocks.notifyInvoicePaidEmail,
  notifyInvoiceValidatedEmail: mocks.notifyInvoiceValidatedEmail,
}));

const owner: AuthUser = {
  id: "00000000-0000-4000-8000-0000000000aa",
  email: "owner@example.com",
  name: "Owner",
  avatar: null,
  phoneNumber: null,
  phoneOwnerName: null,
  organizationId: "00000000-0000-4000-8000-0000000000bb",
  organizationName: "Acme",
  organizationRole: "OWNER",
  emailVerified: null,
};

const targetUserId = "00000000-0000-4000-8000-0000000000cc";

const taskLine = {
  type: "TASK",
  referenceId: targetUserId,
  label: "Tasks M for Alice (Website)",
  quantity: 2,
  unitPrice: "75.00",
  total: "150.00",
};

const octoberInvoiceRequest = {
  userId: targetUserId,
  organizationId: owner.organizationId,
  periodStart: "2025-10-01",
  periodEnd: "2025-10-31",
  status: "VALIDATED",
  totalAmount: "150.00",
  note: "Auto-validated",
  lines: [taskLine],
};

const createApp = () =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", owner);
      await next();
    })
    .post("/", ...createInvoice);

const postInvoice = (body: unknown = octoberInvoiceRequest) =>
  createApp().request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInvoice", () => {
  it("creates an invoice for the requested period and archives that period's eligible tickets", async () => {
    mocks.findInvoiceByPeriodAndUser.mockResolvedValue(null);
    mocks.upsertInvoiceForPeriod.mockResolvedValue({
      conflict: false,
      invoice: {
        id: "inv-oct",
        status: "VALIDATED",
        userId: targetUserId,
        organizationId: owner.organizationId,
        periodStart: "2025-10-01",
        periodEnd: "2025-10-31",
        totalAmount: "150.00",
      },
      archivedTaskIds: ["task-oct-late", "task-oct-review"],
    });
    mocks.getValidatedTaskIdsByPeriodAndUser.mockResolvedValue([
      "task-oct-late",
    ]);
    mocks.getValidatedTaskIdsByPeriodAndReviewer.mockResolvedValue([
      "task-oct-review",
    ]);

    const res = await postInvoice();

    expect(res.status).toBe(201);
    expect(mocks.findInvoiceByPeriodAndUser).toHaveBeenCalledWith(
      "2025-10-01",
      "2025-10-31",
      targetUserId,
      owner.organizationId,
    );
    expect(mocks.getValidatedTaskIdsByPeriodAndUser).toHaveBeenCalledWith(
      targetUserId,
      owner.organizationId,
      new Date("2025-10-01"),
      new Date("2025-10-31"),
    );
    expect(mocks.getValidatedTaskIdsByPeriodAndReviewer).toHaveBeenCalledWith(
      targetUserId,
      owner.organizationId,
      new Date("2025-10-01"),
      new Date("2025-10-31"),
    );
    expect(mocks.upsertInvoiceForPeriod).toHaveBeenCalledTimes(1);
    expect(mocks.upsertInvoiceForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2025-10-01",
        periodEnd: "2025-10-31",
        status: "VALIDATED",
      }),
      [taskLine],
      ["task-oct-late", "task-oct-review"],
    );
  });

  it("adds newly eligible tickets to an existing draft invoice instead of creating a duplicate", async () => {
    mocks.findInvoiceByPeriodAndUser.mockResolvedValue({
      id: "inv-oct-draft",
      status: "DRAFT",
      userId: targetUserId,
      organizationId: owner.organizationId,
      periodStart: "2025-10-01",
      periodEnd: "2025-10-31",
      lines: [],
    });
    mocks.upsertInvoiceForPeriod.mockResolvedValue({
      conflict: false,
      invoice: {
        id: "inv-oct-draft",
        status: "VALIDATED",
        userId: targetUserId,
        organizationId: owner.organizationId,
        periodStart: "2025-10-01",
        periodEnd: "2025-10-31",
        totalAmount: "150.00",
      },
      archivedTaskIds: ["task-validated-in-november"],
    });
    mocks.getValidatedTaskIdsByPeriodAndUser.mockResolvedValue([
      "task-validated-in-november",
    ]);
    mocks.getValidatedTaskIdsByPeriodAndReviewer.mockResolvedValue([]);

    const res = await postInvoice();

    expect(res.status).toBe(201);
    expect(mocks.upsertInvoiceForPeriod).toHaveBeenCalledTimes(1);
    expect(mocks.upsertInvoiceForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2025-10-01",
        periodEnd: "2025-10-31",
        status: "VALIDATED",
      }),
      [taskLine],
      ["task-validated-in-november"],
    );
  });

  it("rejects creation when the period already has a validated invoice", async () => {
    mocks.findInvoiceByPeriodAndUser.mockResolvedValue({
      id: "inv-oct-final",
      status: "VALIDATED",
      userId: targetUserId,
      organizationId: owner.organizationId,
      periodStart: "2025-10-01",
      periodEnd: "2025-10-31",
      lines: [],
    });

    const res = await postInvoice();

    expect(res.status).toBe(409);
    expect(mocks.upsertInvoiceForPeriod).not.toHaveBeenCalled();
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("rejects creation when the period is validated concurrently by another request", async () => {
    mocks.findInvoiceByPeriodAndUser.mockResolvedValue(null);
    mocks.getValidatedTaskIdsByPeriodAndUser.mockResolvedValue([]);
    mocks.getValidatedTaskIdsByPeriodAndReviewer.mockResolvedValue([]);
    mocks.upsertInvoiceForPeriod.mockResolvedValue({ conflict: true });

    const res = await postInvoice();

    expect(res.status).toBe(409);
    expect(mocks.logAudit).not.toHaveBeenCalled();
  });

  it("rejects invoices for another organization", async () => {
    const res = await postInvoice({
      ...octoberInvoiceRequest,
      organizationId: "00000000-0000-4000-8000-0000000000ff",
    });

    expect(res.status).toBe(403);
    expect(mocks.upsertInvoiceForPeriod).not.toHaveBeenCalled();
  });
});

const member: AuthUser = {
  ...owner,
  id: targetUserId,
  email: "member@example.com",
  name: "Member",
  organizationRole: "COLLABORATOR",
};

const outsider: AuthUser = {
  ...owner,
  id: "00000000-0000-4000-8000-0000000000dd",
  email: "outsider@example.com",
  name: "Outsider",
  organizationRole: "COLLABORATOR",
};

const invoiceFixture = (overrides: Record<string, unknown> = {}) => ({
  id: "inv-1",
  userId: targetUserId,
  organizationId: owner.organizationId,
  periodStart: "2025-10-01",
  periodEnd: "2025-10-31",
  status: "VALIDATED",
  totalAmount: "150.00",
  validatedAt: new Date("2025-11-01"),
  paidAt: null,
  ...overrides,
});

const createStatusApp = (user: AuthUser) =>
  new Hono<AuthEnv>()
    .use("*", async (c, next) => {
      c.set("user", user);
      await next();
    })
    .patch("/:id/status", ...updateInvoiceStatus);

const patchStatus = (user: AuthUser, status: string) =>
  createStatusApp(user).request("/inv-1/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

describe("updateInvoiceStatus", () => {
  it("lets the organization owner mark a validated invoice as paid", async () => {
    mocks.findInvoiceById.mockResolvedValue(invoiceFixture());
    mocks.updateInvoice.mockResolvedValue({ id: "inv-1", status: "PAID" });

    const res = await patchStatus(owner, "PAID");

    expect(res.status).toBe(200);
    expect(mocks.updateInvoice).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({
        status: "PAID",
        paidAt: expect.any(Date),
      }),
    );
    expect(mocks.notifyInvoicePaidEmail).toHaveBeenCalledWith("inv-1");
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: targetUserId,
        type: "INVOICE_PAID",
      }),
    );
  });

  it("lets the invoice member mark their own validated invoice as paid", async () => {
    mocks.findInvoiceById.mockResolvedValue(invoiceFixture());
    mocks.updateInvoice.mockResolvedValue({ id: "inv-1", status: "PAID" });

    const res = await patchStatus(member, "PAID");

    expect(res.status).toBe(200);
    expect(mocks.updateInvoice).toHaveBeenCalledWith(
      "inv-1",
      expect.objectContaining({ status: "PAID" }),
    );
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("rejects marking an invoice as paid before it is validated", async () => {
    mocks.findInvoiceById.mockResolvedValue(
      invoiceFixture({ status: "DRAFT" }),
    );

    const res = await patchStatus(owner, "PAID");

    expect(res.status).toBe(409);
    expect(mocks.updateInvoice).not.toHaveBeenCalled();
    expect(mocks.notifyInvoicePaidEmail).not.toHaveBeenCalled();
  });

  it("rejects marking an already paid invoice as paid again", async () => {
    mocks.findInvoiceById.mockResolvedValue(invoiceFixture({ status: "PAID" }));

    const res = await patchStatus(owner, "PAID");

    expect(res.status).toBe(409);
    expect(mocks.updateInvoice).not.toHaveBeenCalled();
  });

  it("rejects marking another member's invoice as paid", async () => {
    mocks.findInvoiceById.mockResolvedValue(invoiceFixture());

    const res = await patchStatus(outsider, "PAID");

    expect(res.status).toBe(403);
    expect(mocks.updateInvoice).not.toHaveBeenCalled();
    expect(mocks.notifyInvoicePaidEmail).not.toHaveBeenCalled();
  });

  it("keeps validate and unvalidate transitions owner-only", async () => {
    mocks.findInvoiceById.mockResolvedValue(invoiceFixture());

    const res = await patchStatus(member, "DRAFT");

    expect(res.status).toBe(403);
    expect(mocks.deleteInvoice).not.toHaveBeenCalled();
    expect(mocks.deleteInvoiceLines).not.toHaveBeenCalled();
  });
});
