import { Card, Typography } from "antd";
import Link from "next/link";

export const SuccessForm = () => {
  return (
    <div>
      <Card title="Password updated!">
        <Typography.Text>
          Your password has been updated. You can now{" "}
          <Link href="/sign-in">sign in</Link> with your new password.
        </Typography.Text>
      </Card>
    </div>
  );
};
