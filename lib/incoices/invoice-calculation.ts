import type { ReviewerTaskSummary } from "@/app/(private)/invoices/_components/task-summary-table";

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

// export function groupReviewerTasks(reviewerTaskData: ReviewerTaskSummary[]) {
//   const map = new Map<string, ReviewerTaskSummary>();

//   for (const item of reviewerTaskData) {
//     const key = `${item.projectId}-${item.size}`;

//     const existing = map.get(key);

//     if (existing) {
//       existing.taskCount += Number(item.taskCount);
//     } else {
//       map.set(key, {
//         ...item,
//         taskCount: Number(item.taskCount),
//       });
//     }
//   }

//   return Array.from(map.values());
// }
