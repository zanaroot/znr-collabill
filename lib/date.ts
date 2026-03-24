export const getISODate = (date: Date = new Date()): string => {
  return date.toISOString().split("T")[0];
};

export const formatToDayMonth = (date: Date): string => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const getFutureDate = (days: number = 7): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};
