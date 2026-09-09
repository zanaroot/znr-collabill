import { publicEnv } from "@/packages/env";

const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

export const getTaskUrl = (taskId: string, projectId: string): string =>
  `${baseUrl}/task-board?projectId=${projectId}&taskId=${taskId}`;
