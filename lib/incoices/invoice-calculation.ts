import type { RawTaskSummary } from "@/app/(private)/invoices/_components/task-summary-table";

type InvoicePresenceSummary = {
  userId: string;
  dailyRate: string | null;
  rate: string | null;
  count: number;
};

type InvoiceReviewerTaskSummary = {
  assignedTo: string;
  assigneeName: string;
  projectId: string;
  projectName: string;
  projectReviewerRate: string | null;
  rateXs: string | null;
  rateS: string | null;
  rateM: string | null;
  rateL: string | null;
  rateXl: string | null;
  size: "XS" | "S" | "M" | "L" | "XL";
  taskCount: number;
};

type EstimateInvoiceParams = {
  targetUserId: string;
  presenceData: InvoicePresenceSummary[];
  taskData: RawTaskSummary[];
  reviewerTaskData: InvoiceReviewerTaskSummary[];
  customLines?: Array<{
    label: string;
    amount: string;
    key: string;
  }>;
};

export function calculateReviewerAmount(task: InvoiceReviewerTaskSummary) {
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
    const projectRate = Number(t.projectBaseRate || 0);

    const totalRate = baseRate * projectRate;
    const amount = t.taskCount * totalRate;

    if (amount > 0) {
      totalAmount += amount;
    }
  }

  // Reviewer tasks
  for (const rt of reviewerTaskData) {
    if (rt.assignedTo !== targetUserId) {
      continue;
    }

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
