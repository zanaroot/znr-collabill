import type { TaskSize } from "@/lib/task-size";

export type CollaboratorRates = {
  dailyRate: string | number;
  rateXs: string | number;
  rateS: string | number;
  rateM: string | number;
  rateL: string | number;
};

export type ProjectRates = Record<string, number>;

export function calculateTaskUnitPrice(
  userId: string,
  taskSize: TaskSize,
  userRates: CollaboratorRates,
  projectRates: ProjectRates | null | undefined,
): number {
  let baseRate: number;

  switch (taskSize) {
    case "XS":
      baseRate = Number(userRates.rateXs);
      break;
    case "S":
      baseRate = Number(userRates.rateS);
      break;
    case "M":
      baseRate = Number(userRates.rateM);
      break;
    case "L":
      baseRate = Number(userRates.rateL);
      break;
    case "XL":
      // Assuming XL is 2x L or 4x M if not explicitly defined
      baseRate = Number(userRates.rateL) * 2;
      break;
    default:
      baseRate = Number(userRates.rateM);
  }

  const multiplier = projectRates?.[userId] ?? 1.0;
  return baseRate * multiplier;
}

export function calculatePresenceUnitPrice(
  userId: string,
  userRates: CollaboratorRates,
  projectRates: ProjectRates | null | undefined,
): number {
  const baseRate = Number(userRates.dailyRate);
  const multiplier = projectRates?.[userId] ?? 1.0;
  return baseRate * multiplier;
}
