import { describe, expect, it } from "vitest";
import {
  cancelBillingSchema,
  changePlanSchema,
  checkoutSchema,
} from "@/http/models/billing.model";

describe("checkoutSchema", () => {
  it("accepts a valid plan code and billing interval", () => {
    expect(
      checkoutSchema.parse({ planCode: "PRO", interval: "MONTHLY" }),
    ).toEqual({ planCode: "PRO", interval: "MONTHLY" });
  });

  it("strips client supplied organization, status and amount fields", () => {
    const parsed = checkoutSchema.parse({
      planCode: "PRO",
      interval: "YEARLY",
      organizationId: "44444444-4444-4444-4444-444444444444",
      status: "ACTIVE",
      amountMinor: 1,
    });

    expect(parsed).toEqual({ planCode: "PRO", interval: "YEARLY" });
  });

  it("requires the billing interval", () => {
    expect(checkoutSchema.safeParse({ planCode: "PRO" }).success).toBe(false);
  });

  it("rejects an unsupported billing interval", () => {
    expect(
      checkoutSchema.safeParse({ planCode: "PRO", interval: "WEEKLY" }).success,
    ).toBe(false);
  });

  it("rejects a malformed plan code", () => {
    expect(
      checkoutSchema.safeParse({
        planCode: "enterprise",
        interval: "MONTHLY",
      }).success,
    ).toBe(false);
  });
});

describe("changePlanSchema", () => {
  it("accepts a plan code without an explicit interval", () => {
    expect(changePlanSchema.parse({ planCode: "FREE" })).toEqual({
      planCode: "FREE",
    });
  });

  it("accepts an explicit billing interval", () => {
    expect(
      changePlanSchema.parse({ planCode: "PRO", interval: "MONTHLY" }),
    ).toEqual({ planCode: "PRO", interval: "MONTHLY" });
  });

  it("strips status fields supplied by the client", () => {
    expect(
      changePlanSchema.parse({ planCode: "FREE", status: "ACTIVE" }),
    ).toEqual({ planCode: "FREE" });
  });

  it("rejects a malformed plan code", () => {
    expect(
      changePlanSchema.safeParse({ planCode: "ENTERPRISE CO" }).success,
    ).toBe(false);
  });

  it("rejects an unsupported billing interval", () => {
    expect(
      changePlanSchema.safeParse({ planCode: "PRO", interval: "WEEKLY" })
        .success,
    ).toBe(false);
  });
});

describe("cancelBillingSchema", () => {
  it("accepts an empty body", () => {
    expect(cancelBillingSchema.parse({})).toEqual({});
  });

  it("accepts a scheduling flag", () => {
    expect(cancelBillingSchema.parse({ atPeriodEnd: true })).toEqual({
      atPeriodEnd: true,
    });
  });

  it("rejects a non boolean scheduling flag", () => {
    expect(cancelBillingSchema.safeParse({ atPeriodEnd: "yes" }).success).toBe(
      false,
    );
  });
});
