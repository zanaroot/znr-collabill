import { publicEnv } from "@/packages/env";

const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const getTaskUrl = (taskId: string, projectId: string): string =>
  `${baseUrl}/task-board?projectId=${projectId}&taskId=${taskId}`;
