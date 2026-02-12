import { Suspense } from "react";
import { CreatePasswordForm } from "@/app/(auth)/create-password/_components/create-password-form";

const CreatePasswordPage = () => {
  return (
    <Suspense>
      <CreatePasswordForm />
    </Suspense>
  );
};

export default CreatePasswordPage;
