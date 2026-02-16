"use client";

import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";

const { Title } = Typography;

interface OrganizationForm {
    name: string;
    description: string;
    ownerName: string;
    ownerEmail: string;
}

export const CreateOrganization = () => {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: OrganizationForm) => {
        setLoading(true);
        try {
            console.log("Form submitted:", values);
            message.success("Organization created successfully!");
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
                <Form
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ name: "", description: "", ownerName: "", ownerEmail: "" }}
                >
                    <Form.Item
                        label="Organization Name"
                        name="name"
                        rules={[{ required: true, message: "Please enter the organization name" }]}
                    >
                        <Input placeholder="Organization" />
                    </Form.Item>
                    <Form.Item
                        label="Description"
                        name="description"
                        rules={[{ required: true, message: "Please enter a description" }]}
                    >
                        <Input.TextArea rows={4} placeholder="Description of the organization" />
                    </Form.Item>
                    <Form.Item
                        label="Owner Name"
                        name="ownerName"
                        rules={[{ required: true, message: "Please enter the owner's name" }]}
                    >
                        <Input placeholder="Name" />
                    </Form.Item>

                    <Form.Item
                        label="Owner Email"
                        name="ownerEmail"
                        rules={[
                            { required: true, message: "Please enter the owner's email" },
                            { type: "email", message: "Please enter a valid email" },
                        ]}
                    >
                        <Input placeholder="user@gmail.com" />
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

