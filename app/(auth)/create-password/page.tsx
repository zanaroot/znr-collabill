import { CreatePasswordForm } from "@/app/(auth)/create-password/_components/create-password-form";
import { Suspense } from "react";

const CreatePasswordPage = () => {
  return (
    <Suspense>
      <CreatePasswordForm />
    </Suspense>
  );
};

export default CreatePasswordPage;
