"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SentryErrorBoundary } from "@/app/_components/sentry-error-boundary";

interface OrganizationForm {
  name: string;
}

export const OrgStep = () => {
  const router = useRouter();

  const onFinish = (values: OrganizationForm) => {
    // Erreur de test pour Sentry
    if (process.env.NODE_ENV === "development") {
      throw new Error("Test Sentry - org step error");
    }

    const params = new URLSearchParams();
    params.set("orgName", values.name);
    router.push(`/sign-up/owner?${params.toString()}`);
  };

  return (
    <SentryErrorBoundary>
      <Card
        title={
          <div className="text-center mt-10">
            <Typography.Title level={3}>Create an Organization</Typography.Title>
            <Typography.Text style={{ color: "#666" }}>
              First, tell us the name of your organization.
            </Typography.Text>
          </div>
        }
        style={{ width: 500 }}
      >
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
            <div className="flex flex-col items-center gap-4">
              <Button
                type="primary"
                htmlType="submit"
                block
                className="bg-blue-600 hover:bg-blue-700 transition-colors rounded-md max-w-full"
              >
                Next: Create Owner Account
              </Button>

              <Link href="/sign-in" prefetch>
                <Button type="link" icon={<ArrowLeftOutlined />}>
                  I already have an account
                </Button>
              </Link>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </SentryErrorBoundary>
  );
};
