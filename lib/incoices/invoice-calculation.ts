import type { PresenceSummary } from "@/http/models/presence.model";
import type {
  RawTaskSummary,
  ReviewerTaskSummary,
} from "@/http/models/task.model";

type EstimateInvoiceParams = {
  targetUserId: string;
  presenceData: PresenceSummary[];
  taskData: RawTaskSummary[];
  reviewerTaskData: ReviewerTaskSummary[];
  customLines?: Array<{
    label: string;
    amount: string;
    key: string;
  }>;
};

export function calculateReviewerAmount(task: ReviewerTaskSummary) {
  let sizeRate = 0;

  switch (task.size) {
    case "XS":
      sizeRate = Number(task.rateXs ?? 0);
      break;
    case "S":
      sizeRate = Number(task.rateS ?? 0);
      break;
    case "M":
      sizeRate = Number(task.rateM ?? 0);
      break;
    case "L":
      sizeRate = Number(task.rateL ?? 0);
      break;
    case "XL":
      sizeRate = Number(task.rateXl ?? 0);
      break;
  }

  const reviewerPercent = Number(task.projectReviewerRate ?? 0);
  const rate = sizeRate * (reviewerPercent / 100);
  const amount = Number(task.taskCount) * rate;

  return {
    rate,
    amount,
  };
}

export const calculateEstimatedInvoice = ({
  targetUserId,
  presenceData,
  taskData,
  reviewerTaskData,
  customLines = [],
}: EstimateInvoiceParams) => {
  let totalAmount = 0;

  // Presence
  const userPresenceData = presenceData.filter(
    (p) => p.userId === targetUserId,
  );

  for (const p of userPresenceData) {
    const dailyRate = Number(p.dailyRate || 0);
    const percentage = Number(p.rate || 0);

    const rate = dailyRate * (percentage / 100);
    const amount = p.count * rate;

    if (amount > 0) {
      totalAmount += amount;
    }
  }

  // Tasks
  for (const t of taskData) {
    if (t.userId !== targetUserId) {
      continue;
    }

    const size = t.size.toLowerCase();

    const rateKey =
      `rate${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof RawTaskSummary;

    const baseRate = Number((t[rateKey] as string | null) || 0);
    const projectRate = Number(t.projectBaseRate || 100);

    const totalRate = baseRate * (projectRate / 100);
    const amount = t.taskCount * totalRate;

    if (amount > 0) {
      totalAmount += amount;
    }
  }

  // Reviewer tasks
  // reviewerTaskData is already filtered by reviewerId = targetUserId
  for (const rt of reviewerTaskData) {
    const { amount } = calculateReviewerAmount(rt);

    if (amount > 0) {
      totalAmount += amount;
    }
  }

  // Custom lines
  for (const line of customLines) {
    const amount = Number(line.amount || 0);

    if (amount !== 0) {
      totalAmount += amount;
    }
  }

  return {
    totalAmount,
  };
};
