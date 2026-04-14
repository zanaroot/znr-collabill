import { Suspense } from "react";
import { CreateAccountForm } from "@/app/(auth)/create-account/_components/create-account-form";

const CreateAccountPage = () => (
  <Suspense>
    <CreateAccountForm />
  </Suspense>
);

export default CreateAccountPage;
