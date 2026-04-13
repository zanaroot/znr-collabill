import { SentryErrorBoundary } from "@/app/_components/sentry-error-boundary";
import { CreateOrganization } from "@/app/(auth)/create-organization/_components/create-organization";

const CreateOrganizationPage = () => {
  return (
    <SentryErrorBoundary>
      <CreateOrganization />
    </SentryErrorBoundary>
  );
};

export default CreateOrganizationPage;
