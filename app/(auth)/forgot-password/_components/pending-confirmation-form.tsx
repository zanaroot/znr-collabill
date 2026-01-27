import { Card, Typography } from "antd";

export const PendingConfirmationForm = () => {
  return (
    <div>
      <Card title="Pending Confirmation">
        <Typography.Text>
          Please check your email for a confirmation link. If you haven&apos;t
          received it, check your spam folder.
        </Typography.Text>
      </Card>
    </div>
  );
};
