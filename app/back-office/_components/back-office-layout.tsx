"use client";

import {
  CreditCardOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { App, Button, Layout, Menu, Space, Tag, Typography, theme } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MENU_ITEMS = [
  { key: "/back-office", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/back-office/plans", icon: <TagsOutlined />, label: "Plans" },
  {
    key: "/back-office/organizations",
    icon: <TeamOutlined />,
    label: "Organizations",
  },
  {
    key: "/back-office/payments",
    icon: <CreditCardOutlined />,
    label: "Payments",
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/back-office": "Billing dashboard",
  "/back-office/plans": "Plans",
  "/back-office/organizations": "Organizations",
  "/back-office/payments": "Payments",
};

export const BackOfficeLayout = ({
  children,
  userName,
  userEmail,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
}) => {
  const pathname = usePathname();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedKey =
    MENU_ITEMS.find((item) => pathname === item.key)?.key ?? "/back-office";
  const pageTitle = PAGE_TITLES[pathname] ?? "Back office";

  return (
    <App>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          theme="light"
          width={250}
          style={{
            position: "sticky",
            top: 0,
            left: 0,
            height: "100vh",
            overflow: "auto",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "16px 16px 8px" }}>
            <Text strong style={{ fontSize: 16 }}>
              CollaBill
            </Text>
            <div>
              <Tag color="blue" style={{ marginTop: 4 }}>
                Platform admin
              </Tag>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={MENU_ITEMS.map((item) => ({
              ...item,
              label: <Link href={item.key}>{item.label}</Link>,
            }))}
          />
          <div style={{ padding: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {userName}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {userEmail}
              </Text>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              href="/"
              style={{ marginTop: 8, paddingLeft: 0 }}
            >
              Open app
            </Button>
          </div>
        </Sider>
        <Layout>
          <Header
            style={{
              background: colorBgContainer,
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text strong style={{ fontSize: 18 }}>
              {pageTitle}
            </Text>
            <Space>
              <Button type="primary" href="/" size="small">
                Back to app
              </Button>
            </Space>
          </Header>
          <Content style={{ margin: 24 }}>
            <div
              style={{
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                padding: 24,
              }}
            >
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </App>
  );
};
