import { Suspense } from "react";
import { ResetPasswordForm } from "./_components/reset-password-form";

const ResetPasswordPage = () => {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
};

export default ResetPasswordPage;
