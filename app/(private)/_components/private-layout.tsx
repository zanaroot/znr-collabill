"use client";

import {
  ApartmentOutlined,
  BellOutlined,
  ContactsOutlined,
  FileTextOutlined,
  LeftOutlined,
  MenuOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Breadcrumb,
  Button,
  Col,
  Drawer,
  Layout,
  Row,
  Space,
  theme,
} from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { OrganizationSwitcher } from "@/app/(private)/_components/organization-switcher";
import { UserDropdownMenus } from "@/app/(private)/_components/user-dropdown-menus";
import { useProjects } from "@/app/(private)/projects/_hooks/use-projects";
import { useCurrentUser } from "@/app/(private)/team-management/_hooks/use-team";
import { cn } from "@/lib/class-name";
import { PresenceModal } from "./presence-modal";

const { Header, Sider, Content } = Layout;

const ROUTE_TITLES: Record<string, string> = {
  "task-board": "Task Board",
  "team-management": "Team Management",
  projects: "Projects",
  invoices: "Invoices",
};

const DynamicBreadcrumb = ({ selectedKey }: { selectedKey: string }) => {
  const searchParams = useSearchParams();
  const { data: projects } = useProjects();
  const projectId = searchParams.get("projectId");

  const pageTitle = ROUTE_TITLES[selectedKey] || "Dashboard";
  const items = [{ title: "Dashboard" }, { title: pageTitle }];

  if (selectedKey === "task-board" && projectId && projects) {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      items.push({ title: project.name });
    }
  }

  return <Breadcrumb items={items} />;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date | null;
};

export const PrivateLayout = ({
  children,
  organization,
  isMissingPresence = false,
}: {
  children: ReactNode;
  organization?: Organization | null;
  isMissingPresence?: boolean;
}) => {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPresenceModal, setShowPresenceModal] = useState(isMissingPresence);
  const { data: currentUser } = useCurrentUser();
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastProjectId(localStorage.getItem("collabill_last_project_id"));
    }
  }, []);

  const selectedKey = pathname.split("/").filter(Boolean)[0] ?? "";
  const isOwner = currentUser?.organizationRole === "OWNER";

  const menuItems = [
    {
      key: "task-board",
      icon: <ContactsOutlined />,
      label: "Task Board",
    },
    {
      key: "projects",
      icon: <ProjectOutlined />,
      label: "Projects",
    },
    {
      key: "invoices",
      icon: <FileTextOutlined />,
      label: "Invoices",
    },
    {
      key: "team-management",
      icon: <UsergroupAddOutlined />,
      label: isOwner ? "Team Management" : "Team members",
    },
    ...(isOwner
      ? [
          {
            key: "type-organization",
            icon: <ApartmentOutlined />,
            label: "Organizations",
          },
        ]
      : []),
  ];

  return (
    <Layout className="responsive-layout">
      <PresenceModal
        open={showPresenceModal}
        organizationId={organization?.id}
        onSuccess={() => setShowPresenceModal(false)}
      />
      <Sider
        className="desktop-sider"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
        width={250}
        collapsedWidth={80}
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          height: "100vh",
          overflow: "auto",
          zIndex: 100,
        }}
      >
        <OrganizationSwitcher
          currentOrganization={organization}
          collapsed={collapsed}
        />
        <div
          style={{
            padding: collapsed ? "8px 8px" : "8px 16px",
          }}
        >
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={
                item.key === "task-board"
                  ? lastProjectId
                    ? `/task-board?projectId=${lastProjectId}`
                    : "/task-board"
                  : `/${item.key}`
              }
              prefetch
              className={cn(
                "flex items-center gap-3 rounded-lg py-3 px-4 mb-1 no-underline transition-all bg-transparent dark:text-inherit! text-black! font-normal",
                selectedKey === item.key &&
                  "bg-[#e6f4ff]! dark:bg-[#1a3a5c]! font-medium",
              )}
            >
              <span style={{ fontSize: 16, display: "flex" }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </div>
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
          style={{
            padding: "0 16px",
            background: colorBgContainer,
          }}
          className="responsive-header"
        >
          <Row
            align="middle"
            justify="space-between"
            gutter={[16, 16]}
            className="header-row"
          >
            <Col className="header-left">
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                className="mobile-menu-btn"
              />
              <Suspense
                fallback={<Breadcrumb items={[{ title: "Dashboard" }]} />}
              >
                <DynamicBreadcrumb selectedKey={selectedKey} />
              </Suspense>
            </Col>
            <Col className="header-right">
              <Space size={16}>
                <QuestionCircleOutlined className="header-icon" />
                <Badge dot>
                  <BellOutlined className="header-icon" />
                </Badge>
                <UserDropdownMenus />
              </Space>
            </Col>
          </Row>
        </Header>

        <Content
          className="responsive-content"
          style={{
            margin: "16px",
            padding: 18,
            minHeight: "calc(100vh - 64px)",
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer Menu */}
      <Drawer
        title={
          <div className="org-drawer-title">
            <span style={{ fontWeight: 600 }}>Menu</span>
          </div>
        }
        placement="left"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        size={280}
        className="mobile-drawer-menu"
      >
        <div className="mobile-menu-content">
          <OrganizationSwitcher
            currentOrganization={organization}
            collapsed={false}
          />
          <div style={{ marginTop: 16 }}>
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={
                  item.key === "task-board"
                    ? lastProjectId
                      ? `/task-board?projectId=${lastProjectId}`
                      : "/task-board"
                    : `/${item.key}`
                }
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 8,
                  marginBottom: 4,
                  background: selectedKey === item.key ? "red" : "transparent",
                  color: selectedKey === item.key ? "#1677ff" : "inherit",
                  fontWeight: selectedKey === item.key ? 500 : 400,
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 18, display: "flex" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </Drawer>
    </Layout>
  );
};
