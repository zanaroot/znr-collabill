"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";

const { Title } = Typography;

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
    <Card style={{ width: 500 }}>
      <Title level={3} style={{ textAlign: "center" }}>
        Create an Organization
      </Title>
      <p style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
        First, tell us the name of your organization.
      </p>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ name: "" }}>
        <Form.Item
          label="Organization Name"
          name="name"
          rules={[
            { required: true, message: "Please enter the organization name" },
          ]}
        >
          <Input placeholder="My Organization" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Next: Create Owner Account
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
