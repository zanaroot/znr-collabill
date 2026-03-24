"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;

interface OrganizationForm {
  name: string;
}

export const OrgStep = () => {
  const router = useRouter();

  const onFinish = (values: OrganizationForm) => {
    const params = new URLSearchParams();
    params.set("orgName", values.name);
    router.push(`/sign-up/owner?${params.toString()}`);
  };

  return (
    <Card
      title={
        <div className="text-center mt-10">
          <Typography.Title level={3}>
            Create an Organization
          </Typography.Title>
          <Typography.Text style={{ color: "#666" }}>
            First, tell us the name of your organization.
          </Typography.Text>
        </div>
      }
      style={{ width: 500 }}>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ name: "" }}>
        <Form.Item
          label="Organization Name"
          name="name"
          rules={[
            { required: true, message: "Please enter the organization name" },
          ]}
        >
          <Input placeholder="My Organization" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-md w-32"
          >
            Next: Create Owner Account
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
