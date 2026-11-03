import { describe, expect, it } from "vitest";
import {
  getBillingPeriodKey,
  resolveBillingPeriodKey,
  selectEligibleBillingTaskIds,
} from "./invoice-assignment";

describe("getBillingPeriodKey", () => {
  it("derives the period key from the work date in UTC, matching SQL billing boundaries", () => {
    expect(getBillingPeriodKey(new Date("2025-09-15T12:00:00.000Z"))).toBe(
      "2025-09",
    );
    expect(getBillingPeriodKey(new Date("2025-12-31T23:59:59.999Z"))).toBe(
      "2025-12",
    );
  });
});

describe("resolveBillingPeriodKey", () => {
  it("keeps a ticket in its work period when that period has no invoice yet", () => {
    expect(resolveBillingPeriodKey("2025-10", new Set())).toBe("2025-10");
  });

  it("stops at the work period when its invoice is still a draft", () => {
    // DRAFT periods are not closed, so they are never in the closed set.
    expect(resolveBillingPeriodKey("2025-10", new Set(["2025-09"]))).toBe(
      "2025-10",
    );
  });

  it("skips validated periods until the next open one", () => {
    expect(resolveBillingPeriodKey("2025-09", new Set(["2025-09"]))).toBe(
      "2025-10",
    );
  });

  it("skips multiple closed periods from different previous months", () => {
    expect(
      resolveBillingPeriodKey(
        "2025-08",
        new Set(["2025-08", "2025-09", "2025-10"]),
      ),
    ).toBe("2025-11");
  });

  it("rolls over the year boundary", () => {
    expect(resolveBillingPeriodKey("2025-12", new Set(["2025-12"]))).toBe(
      "2026-01",
    );
  });

  it("stops walking after the safety cap", () => {
    const allClosed = new Set<string>();
    for (let year = 2000; year < 2100; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        allClosed.add(`${year}-${String(month).padStart(2, "0")}`);
      }
    }

    const resolved = resolveBillingPeriodKey("2000-01", allClosed, 12);

    expect(allClosed.has(resolved)).toBe(true);
  });
});

describe("selectEligibleBillingTaskIds", () => {
  const closed = new Set(["2025-09"]);

  it("assigns a late-validated ticket to the next open invoice", () => {
    const ids = selectEligibleBillingTaskIds(
      [{ id: "late-sept", createdAt: new Date("2025-09-20T00:00:00.000Z") }],
      "2025-10",
      closed,
    );

    expect(ids).toEqual(["late-sept"]);
  });

  it("keeps a ticket out of later periods while an earlier period is still open", () => {
    const ids = selectEligibleBillingTaskIds(
      [{ id: "late-sept", createdAt: new Date("2025-09-20T00:00:00.000Z") }],
      "2025-11",
      closed,
    );

    expect(ids).toEqual([]);
  });

  it("groups tickets from multiple closed periods into the same open invoice", () => {
    const ids = selectEligibleBillingTaskIds(
      [
        { id: "aug", createdAt: new Date("2025-08-05T00:00:00.000Z") },
        { id: "sept", createdAt: new Date("2025-09-20T00:00:00.000Z") },
        { id: "oct-open", createdAt: new Date("2025-10-02T00:00:00.000Z") },
      ],
      "2025-10",
      new Set(["2025-08", "2025-09"]),
    );

    expect(ids).toEqual(["aug", "sept", "oct-open"]);
  });

  it("never assigns tickets whose work period is after the target period", () => {
    const ids = selectEligibleBillingTaskIds(
      [{ id: "nov", createdAt: new Date("2025-11-03T00:00:00.000Z") }],
      "2025-10",
      new Set(),
    );

    expect(ids).toEqual([]);
  });

  it("ignores candidates without a work date", () => {
    const ids = selectEligibleBillingTaskIds(
      [{ id: "no-date", createdAt: null }],
      "2025-10",
      new Set(),
    );

    expect(ids).toEqual([]);
  });

  it("does not assign a ticket to a closed period", () => {
    const ids = selectEligibleBillingTaskIds(
      [{ id: "sept", createdAt: new Date("2025-09-20T00:00:00.000Z") }],
      "2025-09",
      closed,
    );

    expect(ids).toEqual([]);
  });
});
