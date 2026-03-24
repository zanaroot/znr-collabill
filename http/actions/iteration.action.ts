"server only";

import type {
  CreateIterationInput,
  Iteration,
  UpdateIterationInput,
} from "@/http/models/iteration.model";
import {
  createIteration,
  deleteIteration,
  findIterationsByOrganizationId,
  updateIteration,
} from "@/http/repositories/iteration.repository";
import { getCurrentUser } from "./get-current-user";

export const getIterations = async (): Promise<Iteration[]> => {
  const user = await getCurrentUser();
  if (!user?.organizationId) return [];

  const iterations = await findIterationsByOrganizationId(user.organizationId);

  return iterations.map((iter) => ({
    id: iter.id,
    organizationId: iter.organizationId,
    name: iter.name,
    startDate: iter.startDate,
    endDate: iter.endDate,
    status: iter.status ?? "OPEN",
    createdAt: iter.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
};

export const createIterationAction = async (input: CreateIterationInput) => {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    throw new Error("User not authenticated");
  }

  return await createIteration({
    ...input,
    organizationId: user.organizationId,
  });
};

export const updateIterationAction = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateIterationInput;
}) => {
  return await updateIteration(id, data);
};

export const deleteIterationAction = async (id: string) => {
  return await deleteIteration(id);
};
