export const getBillingPeriodKey = (date: Date): string =>
  date.toISOString().slice(0, 7);

const nextBillingPeriodKey = (periodKey: string): string => {
  const [year, month] = periodKey.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return periodKey;
  }
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
};

/**
 * Walks forward from the ticket's work period until it reaches a period that
 * is not closed (i.e. its invoice is missing or still DRAFT). Periods whose
 * invoice is VALIDATED or PAID are skipped so a validated invoice is never
 * modified by newly validated tickets.
 */
export const resolveBillingPeriodKey = (
  workPeriodKey: string,
  closedPeriodKeys: ReadonlySet<string>,
  maxPeriods = 120,
): string => {
  let currentKey = workPeriodKey;

  for (let index = 0; index < maxPeriods; index += 1) {
    if (!closedPeriodKeys.has(currentKey)) {
      return currentKey;
    }

    const nextKey = nextBillingPeriodKey(currentKey);
    if (nextKey === currentKey) {
      return currentKey;
    }
    currentKey = nextKey;
  }

  return currentKey;
};

export const selectEligibleBillingTaskIds = (
  candidates: ReadonlyArray<{ id: string; createdAt: Date | null }>,
  targetPeriodKey: string,
  closedPeriodKeys: ReadonlySet<string>,
): string[] =>
  candidates
    .filter(
      (candidate) =>
        candidate.createdAt !== null &&
        resolveBillingPeriodKey(
          getBillingPeriodKey(candidate.createdAt),
          closedPeriodKeys,
        ) === targetPeriodKey,
    )
    .map((candidate) => candidate.id);
