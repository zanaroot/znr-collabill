import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusSquareOutlined,
  ProjectOutlined,
  RiseOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Card, Col, Flex, Row, Statistic, Typography } from "antd";
import type { ReactNode } from "react";

const { Text } = Typography;

type DashboardStatistics = {
  activeProjects: number;
  openTasks: number;
  teamMembers: number;
  pendingInvoices: number;
  openedTasks: number;
  closedTasks: number;
};

type StatisticRowProps = {
  statistics?: DashboardStatistics;
  loading: boolean;
};

const cards: Array<{
  key: keyof DashboardStatistics;
  title: string;
  icon: ReactNode;
  footerIcon: ReactNode;
  description: string;
}> = [
  {
    key: "activeProjects",
    title: "Projects",
    icon: <ProjectOutlined />,
    footerIcon: <RiseOutlined />,
    description: "Projects in your organization",
  },
  {
    key: "openTasks",
    title: "Open tasks",
    icon: <ClockCircleOutlined />,
    footerIcon: <ClockCircleOutlined />,
    description: "Tasks waiting for action",
  },
  {
    key: "teamMembers",
    title: "Team members",
    icon: <TeamOutlined />,
    footerIcon: <TeamOutlined />,
    description: "Members in your organization",
  },
  {
    key: "pendingInvoices",
    title: "Pending invoices",
    icon: <FileTextOutlined />,
    footerIcon: <ClockCircleOutlined />,
    description: "Invoices awaiting payment",
  },
  {
    key: "openedTasks",
    title: "Opened this month",
    icon: <PlusSquareOutlined />,
    footerIcon: <PlusSquareOutlined />,
    description: "Tickets created this month",
  },
  {
    key: "closedTasks",
    title: "Closed this month",
    icon: <CheckCircleOutlined />,
    footerIcon: <CheckCircleOutlined />,
    description: "Tickets validated this month",
  },
];

export const StatisticsRow = ({ statistics, loading }: StatisticRowProps) => {
  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col key={card.key} xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title={card.title}
              value={statistics?.[card.key] ?? 0}
              loading={loading}
              prefix={card.icon}
            />

            <Flex align="center" gap={6} style={{ marginTop: 12 }}>
              {card.footerIcon}

              <Text type="secondary">{card.description}</Text>
            </Flex>
          </Card>
        </Col>
      ))}
    </Row>
  );
};
