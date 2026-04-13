"use client";

import {
  CheckCircleOutlined,
  DollarOutlined,
  ProjectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import * as Sentry from "@sentry/nextjs";
import { Button, Card, Col, Row, Space, Typography } from "antd";
import { useEffect } from "react";
import { LandingPageSEO } from "./landing-page-seo";

const { Paragraph } = Typography;

const LandingPage = () => {
  // Track landing page view for analytics (once per mount)
  useEffect(() => {
    try {
      Sentry.addBreadcrumb({
        category: "ui",
        message: "landing_page.view",
        data: { component: "LandingPage" },
        level: "info",
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "LandingPage", action: "view" },
      });
    }
  }, []);

  const handleGetStarted = () => {
    try {
      Sentry.addBreadcrumb({
        category: "ui",
        message: "landing_page.get_started_click",
        data: { component: "LandingPage", action: "get_started" },
        level: "info",
      });
      // Navigation via Button href
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "LandingPage", action: "get_started" },
      });
    }
  };

  const handleSignIn = () => {
    try {
      Sentry.addBreadcrumb({
        category: "ui",
        message: "landing_page.sign_in_click",
        data: { component: "LandingPage", action: "sign_in" },
        level: "info",
      });
      // Navigation via Button href
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "LandingPage", action: "sign_in" },
      });
    }
  };

  return (
    <div style={{ background: "#fafafa" }}>
      <LandingPageSEO />
      <section
        style={{
          padding: "120px 24px",
          background: "linear-gradient(135deg, #1677ff, #4096ff)",
          color: "#fff",
        }}
      >
        <Row justify="center">
          <Col xs={24} md={18} lg={14} style={{ textAlign: "center" }}>
            <h1 style={{ color: "#fff", fontSize: 48, margin: 0 }}>
              Manage Projects. Pay Collaborators.
              <br />
              Without the Headache.
            </h1>

            <Paragraph style={{ color: "#e6f4ff", fontSize: 18 }}>
              CollaBill helps you manage tasks, track presence, and
              automatically generate monthly invoices for your collaborators.
            </Paragraph>

            <Space size="large">
              <Button
                type="primary"
                size="large"
                href="/sign-up"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
              <Button size="large" href="/sign-in" onClick={handleSignIn}>
                Sign In
              </Button>
            </Space>
          </Col>
        </Row>
      </section>

      <section style={{ padding: "80px 24px" }}>
        <h2 style={{ textAlign: "center", marginBottom: 48 }}>Key Features</h2>
        <Row justify="center" gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card variant="borderless">
              <ProjectOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <h3>Kanban Project Management</h3>
              <Paragraph>
                Organize tasks with a simple and powerful Kanban board: To do,
                In progress, Review, Validated.
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card variant="borderless">
              <TeamOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <h3>Collaborator Control</h3>
              <Paragraph>
                Invite collaborators, assign tasks, and control access without
                exposing sensitive financial data.
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card variant="borderless">
              <DollarOutlined style={{ fontSize: 32, color: "#1677ff" }} />
              <h3>Automatic Billing</h3>
              <Paragraph>
                Daily presence + validated tasks automatically generate clean,
                transparent monthly invoices.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </section>

      <section style={{ padding: "80px 24px", background: "#fff" }}>
        <Row justify="center">
          <Col xs={24} md={18}>
            <h2 style={{ textAlign: "center" }}>How CollaBill Works</h2>

            <Row gutter={[24, 24]} style={{ marginTop: 48 }}>
              {[
                "Create your project and define billing rules",
                "Invite collaborators and assign tasks",
                "Validate tasks and track daily presence",
                "Generate and pay invoices monthly",
              ].map((step) => (
                <Col xs={24} md={12} key={step}>
                  <Space align="start">
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                    <Paragraph>{step}</Paragraph>
                  </Space>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      </section>

      <section
        style={{
          padding: "80px 24px",
          textAlign: "center",
          background: "#f0f5ff",
        }}
      >
        <h2>Ready to simplify your workflow?</h2>
        <Paragraph>
          Start managing projects and paying collaborators the smart way.
        </Paragraph>

        <Button
          type="primary"
          size="large"
          href="/sign-up"
          onClick={handleGetStarted}
        >
          Create your account
        </Button>
      </section>

      <footer
        style={{
          padding: "24px",
          textAlign: "center",
          color: "#999",
        }}
      >
        © {new Date().getFullYear()} CollaBill — All rights reserved
      </footer>
    </div>
  );
};

export default LandingPage;
