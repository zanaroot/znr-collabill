import { redirect } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user";
import {
  createIterationAction,
  deleteIterationAction,
  getIterations,
  updateIterationAction,
} from "@/http/actions/iteration.action";
import type { CreateIterationInput } from "@/http/models/iteration.model";
import { IterationList } from "./_components/iteration-list";

export default async function IterationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.organizationId) {
    redirect("/onboarding");
  }

  const iterations = await getIterations();

  const handleCreate = async (input: CreateIterationInput) => {
    await createIterationAction(input);
  };

  const handleUpdate = async (
    id: string,
    data: Partial<CreateIterationInput>,
  ) => {
    await updateIterationAction({ id, data });
  };

  const handleDelete = async (id: string) => {
    await deleteIterationAction(id);
  };

  return (
    <IterationList
      iterations={iterations}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
