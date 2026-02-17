"use client";

import { Button, Card, Form, Input, message, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrganizationAction } from "@/http/actions/organization.action";

const { Title } = Typography;

interface OrganizationForm {
  name: string;
}

export const CreateOrganization = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: OrganizationForm) => {
    setLoading(true);
    try {
      const result = await createOrganizationAction(values.name);
      if (result.success) {
        message.success("Organization created successfully!");
        router.push("/task-board");
      } else {
        message.error(result.error || "Error creating the organization.");
      }
    } catch (error) {
      console.error(error);
      message.error("Error creating the organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <Card style={{ width: 500 }}>
        <Title level={3} style={{ textAlign: "center" }}>
          Create an Organization
        </Title>
        <p style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>
          You need to create an organization to get started. You will become the
          owner.
        </p>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ name: "" }}
        >
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
            <Button type="primary" htmlType="submit" block loading={loading}>
              Create Organization
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
