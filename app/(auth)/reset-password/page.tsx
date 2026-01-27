import { ResetPasswordForm } from "./_components/reset-password-form";
import { Suspense } from "react";

const ResetPasswordPage = () => {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
};

export default ResetPasswordPage;
