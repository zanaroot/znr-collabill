import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

export type Period = {
  id: string; // YYYY-MM
  name: string; // Month YYYY
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export const getMonthlyPeriods = (count = 12): Period[] => {
  const now = new Date();
  const periods: Period[] = [];

  for (let i = 0; i < count; i++) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    periods.push({
      id: format(date, "yyyy-MM"),
      name: format(date, "MMMM yyyy"),
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  }

  return periods;
};

export const getCurrentPeriod = (): Period => {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  return {
    id: format(now, "yyyy-MM"),
    name: format(now, "MMMM yyyy"),
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
};

export const getPeriodById = (id: string): Period | null => {
  try {
    const [year, month] = id.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    return {
      id,
      name: format(date, "MMMM yyyy"),
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  } catch {
    return null;
  }
};
