import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/http/repositories/invitation.repository", () => ({
  findInvoiceByIdWithOrganization: vi.fn(),
}));

vi.mock("@/packages/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/packages/slack", () => ({
  buildTaskAssignedMessage: vi.fn(),
  buildTaskCommentMessage: vi.fn(),
  buildTaskReviewMessage: vi.fn(),
  buildTaskValidatedMessage: vi.fn(),
  sendSlackMessageWithCredentials: vi.fn(),
}));

vi.mock("@/http/repositories/project.repository", () => ({
  findProjectById: vi.fn(),
}));

vi.mock("@/http/repositories/task.repository", () => ({
  findTaskWithAssigneeById: vi.fn(),
}));

vi.mock("@/http/actions/integrations.action", () => ({
  getOrgSlackCredentialsDecrypted: vi.fn(),
}));

vi.mock("@/app/_utils/get-task-by-url", () => ({
  getTaskUrl: vi.fn(),
}));

import { findInvoiceByIdWithOrganization } from "@/http/repositories/invitation.repository";
import {
  notifyInvoicePaidEmail,
  notifyInvoiceValidatedEmail,
} from "@/lib/notifications";
import { sendEmail } from "@/packages/email";

const mockedFindInvoice = vi.mocked(findInvoiceByIdWithOrganization);
const mockedSendEmail = vi.mocked(sendEmail);

const invoiceId = "123e4567-e89b-12d3-a456-426614174000";

describe("invoice email notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("notifyInvoiceValidatedEmail", () => {
    it("sends email only to the invoice owner", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob InvoiceOwner",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      expect(mockedSendEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "bob@example.com",
        }),
      );
    });

    it("includes organization name in email content", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Acme Corp");
      expect(call.text).toContain("Acme Corp");
    });

    it("includes organization owner name in email content", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Alice Owner");
      expect(call.text).toContain("Alice Owner");
    });

    it("does not include org owner line when org owner is null", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: null,
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).not.toContain("Validated by:");
      expect(call.text).not.toContain("Validated by:");
    });

    it("does nothing when invoice is not found", async () => {
      mockedFindInvoice.mockReturnValue(
        Promise.resolve(null) as unknown as ReturnType<
          typeof findInvoiceByIdWithOrganization
        >,
      );

      await notifyInvoiceValidatedEmail(invoiceId);

      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("does nothing when invoice owner email is missing", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: null,
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("does not send email to other organization members", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoiceValidatedEmail(invoiceId);

      expect(mockedSendEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({ to: "alice@example.com" }),
      );
      expect(mockedSendEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({ to: "admin@example.com" }),
      );
    });
  });

  describe("notifyInvoicePaidEmail", () => {
    it("sends email only to the invoice owner", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob InvoiceOwner",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoicePaidEmail(invoiceId);

      expect(mockedSendEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "bob@example.com",
        }),
      );
    });

    it("includes organization name in email content", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoicePaidEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Acme Corp");
      expect(call.text).toContain("Acme Corp");
    });

    it("includes organization owner name in email content", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoicePaidEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).toContain("Alice Owner");
      expect(call.text).toContain("Alice Owner");
    });

    it("does not include org owner line when org owner is null", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: null,
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoicePaidEmail(invoiceId);

      const call = mockedSendEmail.mock.calls[0][0];
      expect(call.html).not.toContain("Marked by:");
      expect(call.text).not.toContain("Marked by:");
    });

    it("does nothing when invoice is not found", async () => {
      mockedFindInvoice.mockReturnValue(
        Promise.resolve(null) as unknown as ReturnType<
          typeof findInvoiceByIdWithOrganization
        >,
      );

      await notifyInvoicePaidEmail(invoiceId);

      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("does nothing when invoice owner email is missing", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: null,
      });

      await notifyInvoicePaidEmail(invoiceId);

      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it("does not send email to other organization members", async () => {
      mockedFindInvoice.mockResolvedValue({
        id: invoiceId,
        organizationId: "org-1",
        organizationName: "Acme Corp",
        organizationOwnerName: "Alice Owner",
        ownerName: "Bob",
        ownerEmail: "bob@example.com",
      });

      await notifyInvoicePaidEmail(invoiceId);

      expect(mockedSendEmail).toHaveBeenCalledTimes(1);
      expect(mockedSendEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({ to: "alice@example.com" }),
      );
      expect(mockedSendEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({ to: "admin@example.com" }),
      );
    });
  });
});
