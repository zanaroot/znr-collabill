"use client";

import { DeleteOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Card, Input, List, Space, Typography } from "antd";

const { Text } = Typography;

interface FinanceEmail {
    id: string;
    email: string;
}

interface OrganizationFinancePanelProps {
    financeEmail: string;
    setFinanceEmail: (value: string) => void;
    financeEmails: FinanceEmail[];
    onAdd: () => void;
    onDelete: (id: string) => void;
    isAdding?: boolean;
    isDeleting?: boolean;
}

export const OrganizationFinancePanel = ({
    financeEmail,
    setFinanceEmail,
    financeEmails,
    onAdd,
    onDelete,
    isAdding = false,
    isDeleting = false,
}: OrganizationFinancePanelProps) => {
    return (
        <Card title="Finance Email Recipients">
            <Text type="secondary">
                Configure the email addresses that should receive a PDF copy whenever
                an invoice is validated.
            </Text>

            <div
                style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 20,
                    marginBottom: 24,
                }}
            >
                <Input
                    value={financeEmail}
                    onChange={(e) => setFinanceEmail(e.target.value)}
                    placeholder="finance@company.com"
                    style={{ flex: 1 }}
                />

                <Button
                    type="primary"
                    loading={isAdding}
                    onClick={onAdd}
                >
                    Add
                </Button>
            </div>

            <List
                bordered
                locale={{ emptyText: "No finance emails configured" }}
                dataSource={financeEmails}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Button
                                key="delete"
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                loading={isDeleting}
                                onClick={() => onDelete(item.id)}
                            />,
                        ]}
                    >
                        <Space>
                            <MailOutlined />
                            {item.email}
                        </Space>
                    </List.Item>
                )}
            />
        </Card>
    );
};

