"use client";
import {
  BellOutlined,
  ContactsOutlined,
  LeftOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Badge, Breadcrumb, Button, Layout, Menu, Space, theme } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { OrganizationSwitcher } from "@/app/(private)/_components/organization-switcher";
import { UserDropdownMenus } from "@/app/(private)/_components/user-dropdown-menus";

const { Header, Sider, Content } = Layout;
type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | null;
};

export const PrivateLayout = ({
  children,
  organization,
}: {
  children: ReactNode;
  organization?: Organization | null;
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedKey = pathname.split("/").filter(Boolean)[0] ?? "";

  return (
    <Layout>
      <Sider collapsible collapsed={collapsed} trigger={null} theme="light">
        <OrganizationSwitcher
          currentOrganization={organization}
          collapsed={collapsed}
        />
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            {
              key: "task-board",
              icon: <ContactsOutlined />,
              label: <Link href="/task-board">Task Board</Link>,
            },
            {
              key: "team-management",
              icon: <UsergroupAddOutlined />,
              label: <Link href="/team-management" prefetch={true}>Team Management</Link>,
            },
            {
              key: "projects",
              icon: <ProjectOutlined />,
              label: <Link href="/projects" prefetch={true}>Projects</Link>,
            },
          ]}
        />
        <Button
          onClick={() => setCollapsed(!collapsed)}
          icon={
            collapsed ? (
              <RightOutlined style={{ fontSize: 10 }} />
            ) : (
              <LeftOutlined style={{ fontSize: 10 }} />
            )
          }
          style={{
            position: "absolute",
            right: -14,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 101,
            width: 14,
            height: 48,
            borderRadius: "0 8px 8px 0",
            borderLeft: "none",
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{ padding: 0, background: colorBgContainer }}
          className="flex items-center px-4! justify-between"
        >
          <Breadcrumb
            items={[
              {
                title: "Dashboard",
              },
              {
                title: "Flow Board",
              },
            ]}
          />
          <Space size={16}>
            <QuestionCircleOutlined />
            <Badge dot>
              <BellOutlined />
            </Badge>
            <UserDropdownMenus />
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 18,
            minHeight: "calc(100vh - 112px)",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
