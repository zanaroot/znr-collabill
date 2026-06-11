"use client";

import {
  CheckCircleOutlined,
  DollarOutlined,
  GithubOutlined,
  MenuOutlined,
  ProjectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Drawer,
  Layout,
  Row,
  Typography,
  theme,
} from "antd";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "../_hooks/use-theme";
import { LandingPageSEO } from "./landing-page-seo";

const { Title, Paragraph, Text } = Typography;
const { Header, Content, Footer } = Layout;

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  const menuItems = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
  ];

  return (
    <Header
      className={`fixed w-full z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b transition-all ${
        isDark
          ? "bg-[#141414]/80 border-white/10"
          : "bg-white/80 border-black/5"
      } backdrop-blur-md`}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <DollarOutlined className="text-white text-lg" />
          </div>
          <span
            className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
          >
            CollaBill
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-blue-600"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <Button
            type="text"
            href="/sign-in"
            className={isDark ? "text-slate-300" : "text-slate-600"}
          >
            Sign In
          </Button>
          <Button type="primary" href="/sign-up" className="rounded-full px-6">
            Get Started
          </Button>
        </div>

        <Button
          type="text"
          icon={
            <MenuOutlined
              className={isDark ? "text-white" : "text-slate-900"}
            />
          }
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        />
      </div>

      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col p-6 gap-4">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-lg font-medium py-2 border-b border-slate-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Button size="large" href="/sign-in" className="w-full">
              Sign In
            </Button>
            <Button
              size="large"
              type="primary"
              href="/sign-up"
              className="w-full"
            >
              Get Started
            </Button>
          </div>
        </div>
      </Drawer>
    </Header>
  );
};

const Hero = () => {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  return (
    <section
      className={`pt-32 pb-20 px-6 md:px-12 overflow-hidden ${isDark ? "bg-[#141414]" : "bg-slate-50"}`}
    >
      <div className="max-w-7xl mx-auto">
        <Row gutter={[48, 48]} align="middle">
          <Col xs={24} lg={12} className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-semibold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Simplified billing for modern teams
            </div>
            <Title
              level={1}
              className={`!text-4xl md:!text-6xl !font-extrabold !mb-6 !leading-tight ${isDark ? "!text-white" : "!text-slate-900"}`}
            >
              Manage Projects. <br />
              <span className="text-blue-600">Pay Collaborators.</span> <br />
              Without the Headache.
            </Title>
            <Paragraph
              className={`text-lg md:text-xl mb-10 max-w-xl ${isDark ? "text-slate-400" : "text-slate-600"}`}
            >
              CollaBill helps you manage tasks, track presence, and
              automatically generate transparent monthly invoices for your
              collaborators.
            </Paragraph>
            <div className="flex flex-wrap gap-4">
              <Button
                type="primary"
                size="large"
                href="/sign-up"
                className="h-14 px-8 rounded-full text-lg font-semibold shadow-lg shadow-blue-500/25"
              >
                Start for Free
              </Button>
              <Button
                size="large"
                href="/sign-in"
                className="h-14 px-8 rounded-full text-lg font-semibold"
              >
                Live Demo
              </Button>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <Avatar.Group>
                {[1, 2, 3, 4].map((i) => (
                  <Avatar
                    key={i}
                    src={`https://i.pravatar.cc/150?u=${i}`}
                    className={`border-2 ${isDark ? "border-slate-800" : "border-white"}`}
                  />
                ))}
              </Avatar.Group>
              <Text className={isDark ? "text-slate-500" : "text-slate-500"}>
                Joined by{" "}
                <span
                  className={
                    isDark
                      ? "text-white font-semibold"
                      : "text-slate-900 font-semibold"
                  }
                >
                  500+
                </span>{" "}
                agencies worldwide
              </Text>
            </div>
          </Col>

          <Col xs={24} lg={12} className="relative">
            <div
              className={`relative rounded-2xl border ${isDark ? "border-white/10 bg-white/5" : "border-black/5 bg-white shadow-2xl"} p-2 overflow-hidden`}
            >
              <div
                className={`aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 ${isDark ? "bg-slate-900" : "bg-slate-100"}`}
              >
                {/* This would ideally be a screenshot or a mock of the app */}
                <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
                  [Dashboard Preview]
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-400/20 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-400/20 blur-3xl rounded-full"></div>
          </Col>
        </Row>
      </div>
    </section>
  );
};

const Features = () => {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  const features = [
    {
      icon: <ProjectOutlined className="text-3xl text-blue-600" />,
      title: "Kanban Project Management",
      description:
        "Organize tasks with a simple and powerful Kanban board: To do, In progress, Review, Validated.",
    },
    {
      icon: <TeamOutlined className="text-3xl text-blue-600" />,
      title: "Collaborator Control",
      description:
        "Invite collaborators, assign tasks, and control access without exposing sensitive financial data.",
    },
    {
      icon: <DollarOutlined className="text-3xl text-blue-600" />,
      title: "Automatic Billing",
      description:
        "Daily presence + validated tasks automatically generate clean, transparent monthly invoices.",
    },
  ];

  return (
    <section
      id="features"
      className={`py-24 px-6 md:px-12 ${isDark ? "bg-[#0a0a0a]" : "bg-white"}`}
    >
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3">
          Why CollaBill?
        </h2>
        <Title
          level={2}
          className={`!text-3xl md:!text-5xl !font-bold ${isDark ? "!text-white" : "!text-slate-900"}`}
        >
          Everything you need to <br /> manage your team's billing
        </Title>
      </div>

      <Row gutter={[32, 32]}>
        {features.map((feature) => (
          <Col xs={24} md={8} key={feature.title}>
            <Card
              className={`h-full border transition-all hover:-translate-y-2 hover:shadow-xl ${
                isDark
                  ? "bg-[#141414] border-white/5 hover:border-blue-500/50"
                  : "bg-white border-slate-100 hover:border-blue-200"
              }`}
              variant="borderless"
            >
              <div className="mb-6 p-4 bg-blue-500/5 rounded-2xl w-fit">
                {feature.icon}
              </div>
              <h3
                className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}
              >
                {feature.title}
              </h3>
              <Paragraph
                className={isDark ? "text-slate-400" : "text-slate-600"}
              >
                {feature.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};

const HowItWorks = () => {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  const steps = [
    {
      title: "Define Billing Rules",
      description:
        "Create your project and set hourly or daily rates for your collaborators.",
    },
    {
      title: "Assign Tasks",
      description:
        "Invite collaborators and assign them tasks on the Kanban board.",
    },
    {
      title: "Track & Validate",
      description:
        "Validate completed tasks and track daily presence with one click.",
    },
    {
      title: "Get Paid",
      description:
        "Generate professional monthly invoices automatically and pay your team.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className={`py-24 px-6 md:px-12 ${isDark ? "bg-[#141414]" : "bg-slate-50"}`}
    >
      <div className="max-w-7xl mx-auto">
        <Row gutter={[48, 48]} align="middle">
          <Col xs={24} lg={12}>
            <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-3">
              The Workflow
            </h2>
            <Title
              level={2}
              className={`!text-3xl md:!text-5xl !font-bold !mb-8 ${isDark ? "!text-white" : "!text-slate-900"}`}
            >
              How CollaBill works
            </Title>

            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4
                      className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-slate-900"}`}
                    >
                      {step.title}
                    </h4>
                    <Paragraph
                      className={isDark ? "text-slate-400" : "text-slate-600"}
                    >
                      {step.description}
                    </Paragraph>
                  </div>
                </div>
              ))}
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div
              className={`p-8 rounded-3xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"}`}
            >
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-xl ${isDark ? "bg-slate-800/50" : "bg-slate-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CheckCircleOutlined />
                      </div>
                      <div>
                        <div
                          className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                        >
                          Invoice #INV-202{i}
                        </div>
                        <div className="text-xs text-slate-500">
                          Processed June 2{i}, 2026
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-blue-600">$1,250.00</div>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </section>
  );
};

const CTA = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-blue-600 relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <Title
          level={2}
          className="!text-3xl md:!text-5xl !font-bold !text-white !mb-6"
        >
          Ready to simplify your workflow?
        </Title>
        <Paragraph className="text-blue-100 text-lg md:text-xl mb-10">
          Join hundreds of teams who have reclaimed their time with automated
          billing and project management.
        </Paragraph>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="large"
            className="h-14 px-8 rounded-full text-lg font-semibold bg-white text-blue-600 border-white hover:!bg-blue-50"
          >
            Create your account
          </Button>
          <Button
            size="large"
            ghost
            className="h-14 px-8 rounded-full text-lg font-semibold text-white border-white hover:!bg-white/10"
          >
            Schedule a demo
          </Button>
        </div>
      </div>

      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full"></div>
    </section>
  );
};

const MainFooter = () => {
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  return (
    <Footer
      className={`py-12 px-6 md:px-12 border-t ${isDark ? "bg-[#0a0a0a] border-white/10" : "bg-white border-slate-100"}`}
    >
      <div className="max-w-7xl mx-auto">
        <Row gutter={[48, 48]}>
          <Col xs={24} md={12} lg={8}>
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DollarOutlined className="text-white text-lg" />
              </div>
              <span
                className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
              >
                CollaBill
              </span>
            </Link>
            <Paragraph
              className={isDark ? "text-slate-500" : "text-slate-500 text-sm"}
            >
              The collaborative billing platform for modern agencies and
              freelancers. Simplify your workflow and focus on what matters
              most.
            </Paragraph>
            <div className="flex gap-4 mt-6">
              <Button
                type="text"
                icon={<GithubOutlined />}
                className={isDark ? "text-slate-400" : "text-slate-400"}
              />
              <Button
                type="text"
                icon={<TeamOutlined />}
                className={isDark ? "text-slate-400" : "text-slate-400"}
              />
            </div>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <h4
              className={`font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Product
            </h4>
            <ul className="space-y-4 list-none p-0">
              <li>
                <Link
                  href="#features"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Integrations
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <h4
              className={`font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Resources
            </h4>
            <ul className="space-y-4 list-none p-0">
              <li>
                <Link
                  href="#"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </Col>

          <Col xs={24} lg={8}>
            <h4
              className={`font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Stay Updated
            </h4>
            <Paragraph className="text-slate-500 text-sm mb-4">
              Get the latest updates and tips directly in your inbox.
            </Paragraph>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-slate-50 border-slate-200"
                }`}
              />
              <Button type="primary">Subscribe</Button>
            </div>
          </Col>
        </Row>

        <div
          className={`mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${isDark ? "border-white/10" : "border-slate-100"}`}
        >
          <Text className="text-slate-500 text-sm">
            © {new Date().getFullYear()} CollaBill — All rights reserved
          </Text>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-slate-500 text-sm hover:text-blue-600"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-slate-500 text-sm hover:text-blue-600"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </Footer>
  );
};

const LandingPage = () => {
  const { theme: appTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm:
          appTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 8,
        },
      }}
    >
      <Layout className="min-h-screen bg-transparent">
        <LandingPageSEO />
        <Navbar />
        <Content>
          <Hero />
          <Features />
          <HowItWorks />
          <CTA />
        </Content>
        <MainFooter />
      </Layout>
    </ConfigProvider>
  );
};

export default LandingPage;
