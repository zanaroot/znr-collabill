"use client";

import { Avatar, Button, ConfigProvider, Drawer, Layout, theme } from "antd";
import {
  ArrowRight,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  GitBranch,
  Kanban as KanbanIcon,
  Mail,
  Menu,
  Play,
  Sliders,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "../_hooks/use-theme";
import { cn } from "../_utils/class-name";
import { LandingPageSEO } from "./landing-page-seo";

const { Content, Footer } = Layout;

// SVG Grid Line Background Component for that premium developer tool look
const GridPattern = () => (
  <svg
    className="absolute inset-0 -z-10 h-full w-full stroke-slate-200/40 dark:stroke-zinc-800/20 [mask-image:radial-gradient(100%_100%_at_top_center,white,transparent)]"
    aria-hidden="true"
  >
    <defs>
      <pattern
        id="grid-pattern"
        width="40"
        height="40"
        patternUnits="userSpaceOnUse"
        x="50%"
        y="-1"
      >
        <path d="M.5 40V.5H40" fill="none" />
      </pattern>
    </defs>
    <rect
      width="100%"
      height="100%"
      strokeWidth="0"
      fill="url(#grid-pattern)"
    />
  </svg>
);

// Navigation Bar
const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme: appTheme, toggleTheme } = useTheme();
  const isDark = appTheme === "dark";

  const menuItems = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="fixed w-full top-0 left-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b transition-all bg-white/75 dark:bg-zinc-950/75 border-slate-200/50 dark:border-zinc-800/50 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <DollarSign className="text-white text-xl stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            CollaBill
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium transition-colors text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          {isDark ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Light theme</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 0l-.707-.707m12.728-12.728l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <title>Dark theme</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        <div className="hidden sm:flex items-center gap-3">
          <Button
            type="text"
            href="/sign-in"
            className="text-slate-600 dark:text-zinc-300 font-medium hover:text-blue-600 dark:hover:text-blue-400"
          >
            Sign In
          </Button>
          <Button
            type="primary"
            href="/sign-up"
            className="rounded-xl px-5 h-10 font-medium bg-blue-600 dark:bg-blue-500 hover:!bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Get Started
          </Button>
        </div>

        <Button
          type="text"
          icon={<Menu className="text-slate-900 dark:text-white" />}
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        />
      </div>

      <Drawer
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="text-white text-sm stroke-[2.5]" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              CollaBill
            </span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        className="dark:bg-zinc-950 dark:text-white"
        styles={{
          body: { padding: 0 },
          header: { borderBottom: "1px solid rgba(120, 120, 120, 0.1)" },
        }}
      >
        <div className="flex flex-col p-6 gap-4 bg-white dark:bg-zinc-950 h-full">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-lg font-semibold py-3 border-b border-slate-100 dark:border-zinc-900 text-slate-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-8">
            <Button
              size="large"
              href="/sign-in"
              className="w-full rounded-xl border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Button>
            <Button
              size="large"
              type="primary"
              href="/sign-up"
              className="w-full rounded-xl bg-blue-600 dark:bg-blue-500"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Button>
          </div>
        </div>
      </Drawer>
    </header>
  );
};

// Stateful Interactive App Mockup inside Hero
const InteractiveDashboardMockup = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Landing Page Redesign",
      hours: 14,
      rate: 55,
      category: "Frontend",
      status: "review",
      assignee: "Alex M.",
      avatarId: 1,
    },
    {
      id: 2,
      title: "API Authentication layer",
      hours: 8,
      rate: 65,
      category: "Backend",
      status: "review",
      assignee: "Jessica T.",
      avatarId: 2,
    },
    {
      id: 3,
      title: "Database Migrations v2",
      hours: 10,
      rate: 50,
      category: "Database",
      status: "validated",
      assignee: "Sarah K.",
      avatarId: 3,
    },
  ]);

  const [totalAmount, setTotalAmount] = useState(4850);
  const [pulseGlow, setPulseGlow] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);

  // Function to simulate validating a task
  const handleValidateTask = (taskId: number, title: string, cost: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "validated" } : t)),
    );
    setTotalAmount((prev) => prev + cost);
    setPulseGlow(true);
    setNotif(
      `Task validated: "${title}" +$${cost.toLocaleString()} billable credit added!`,
    );

    setTimeout(() => setPulseGlow(false), 1500);
    setTimeout(() => setNotif(null), 4000);
  };

  const reviewTasks = tasks.filter((t) => t.status === "review");
  const validatedTasks = tasks.filter((t) => t.status === "validated");

  return (
    <div className="relative w-full rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 shadow-2xl p-2 md:p-3 overflow-hidden backdrop-blur-sm">
      {/* OS Top Bar Decor */}
      <div className="flex items-center justify-between pb-3 px-3 border-b border-slate-100 dark:border-zinc-900">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="text-xs font-semibold text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900/50 px-4 py-0.5 rounded-full border border-slate-100 dark:border-zinc-800/30">
          collabill.com/dashboard
        </div>
        <div className="w-10" />
      </div>

      {/* Main Sandbox Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-2 md:p-4 min-h-[340px] text-left">
        {/* Sidebar Mock */}
        <div className="hidden md:flex flex-col gap-1 pr-3 border-r border-slate-100 dark:border-zinc-900/80">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-extrabold tracking-wide uppercase">
              Summer Agency Co.
            </span>
          </div>

          {[
            {
              label: "Dashboard",
              active: true,
              icon: <Sliders className="w-4 h-4" />,
            },
            {
              label: "Kanban Board",
              active: false,
              icon: <KanbanIcon className="w-4 h-4" />,
            },
            {
              label: "Collaborators",
              active: false,
              icon: <UsersIcon className="w-4 h-4" />,
            },
            {
              label: "Monthly Invoices",
              active: false,
              icon: <CreditCard className="w-4 h-4" />,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors",
                item.active
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm shadow-blue-500/15"
                  : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40 hover:text-slate-950 dark:hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>

        {/* Content Area Mock */}
        <div className="md:col-span-3 flex flex-col gap-4">
          {/* Top Panel stats widget */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800/30">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                Active Billing Credit
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-xl md:text-2xl font-black tracking-tight transition-all duration-300",
                    pulseGlow
                      ? "text-green-600 dark:text-green-400 scale-105"
                      : "text-slate-900 dark:text-white",
                  )}
                >
                  ${totalAmount.toLocaleString()}.00
                </span>
                <span className="text-xs font-bold text-green-500 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +12%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800/30">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                Validated Tasks
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {validatedTasks.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">
                  / {tasks.length} total
                </span>
              </div>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* IN REVIEW COLUMN */}
            <div className="flex flex-col gap-2 p-2.5 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-900 rounded-xl">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-900">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    In Review
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-500">
                  {reviewTasks.length}
                </span>
              </div>

              {reviewTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center h-full text-slate-300 dark:text-zinc-700">
                  <CheckCircle className="w-8 h-8 stroke-[1.5] mb-1.5 text-green-500/50" />
                  <span className="text-xs font-medium">
                    All tasks approved!
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px]">
                  {reviewTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800/80 rounded-lg shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group/card"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1">
                          {t.title}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                          {t.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-zinc-900">
                        <div className="flex items-center gap-1">
                          <Avatar
                            size={16}
                            src={`https://i.pravatar.cc/100?img=${t.avatarId + 10}`}
                          />
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                            {t.assignee}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                            {t.hours}h • ${t.rate}/h
                          </span>
                          <button
                            onClick={() =>
                              handleValidateTask(
                                t.id,
                                t.title,
                                t.hours * t.rate,
                              )
                            }
                            type="button"
                            className="text-[9px] bg-green-500 dark:bg-green-600 text-white px-2 py-0.5 rounded-full font-bold hover:bg-green-600 dark:hover:bg-green-500 cursor-pointer flex items-center gap-0.5 transition-colors"
                          >
                            <Check className="w-2.5 h-2.5" /> Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VALIDATED COLUMN */}
            <div className="flex flex-col gap-2 p-2.5 bg-slate-50/50 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-900 rounded-xl">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-zinc-900">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Validated
                  </span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-500">
                  {validatedTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px]">
                {validatedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-white/60 dark:bg-zinc-900/60 border border-dashed border-green-200 dark:border-green-950 rounded-lg shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 line-clamp-1 line-through">
                        {t.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 shrink-0 flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Approved
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-zinc-900">
                      <div className="flex items-center gap-1 opacity-60">
                        <Avatar
                          size={16}
                          src={`https://i.pravatar.cc/100?img=${t.avatarId + 10}`}
                        />
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                          {t.assignee}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-500">
                        +${(t.hours * t.rate).toLocaleString()}.00
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating simulated notifications */}
      {notif && (
        <div className="absolute bottom-4 right-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-bounce border border-white/10 dark:border-zinc-200 z-20 max-w-[90%] pointer-events-none">
          <Sparkles className="w-4 h-4 text-blue-400 dark:text-blue-600 shrink-0" />
          <span>{notif}</span>
        </div>
      )}

      {/* Interactive instruction banner */}
      <div className="py-2.5 bg-blue-50 dark:bg-blue-950/20 border-t border-slate-100 dark:border-zinc-900 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5">
        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
        <span>
          Try it: Click{" "}
          <b className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-[11px]">
            Approve
          </b>{" "}
          on an active task above to compile billing live!
        </span>
      </div>
    </div>
  );
};

// Hero Section
const Hero = () => {
  return (
    <section className="relative pt-32 pb-24 px-6 md:px-12 overflow-hidden bg-transparent">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent blur-[120px] rounded-full -z-20 pointer-events-none" />
      <div className="absolute top-1/3 left-[10%] w-[400px] h-[400px] bg-sky-500/10 dark:bg-sky-500/5 blur-[100px] rounded-full -z-20 pointer-events-none" />

      <GridPattern />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Hero Text */}
          <div className="lg:col-span-6 relative z-10 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/8 dark:bg-blue-500/15 border border-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Simplified billing for modern teams
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-slate-900 dark:text-white mb-6">
              Manage Projects. <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                Pay Collaborators.
              </span>{" "}
              <br />
              Without the Headache.
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 mb-10 max-w-xl font-medium leading-relaxed">
              CollaBill helps you manage tasks, track presence, and
              automatically generate transparent monthly invoices for your
              collaborators.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                type="primary"
                size="large"
                href="/sign-up"
                className="h-14 px-8 rounded-2xl text-lg font-bold bg-blue-600 dark:bg-blue-500 hover:!bg-blue-700 hover:scale-[1.02] shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center gap-2"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </Button>
              <Button
                size="large"
                href="/sign-in"
                className="h-14 px-8 rounded-2xl text-lg font-bold border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[1.02] active:scale-98 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current stroke-[2]" /> Live Demo
              </Button>
            </div>

            <div className="mt-14 flex items-center gap-4">
              <Avatar.Group>
                {[1, 2, 3, 4].map((i) => (
                  <Avatar
                    key={i}
                    src={`https://i.pravatar.cc/150?u=${i + 15}`}
                    className="border-2 border-white dark:border-zinc-950 w-10 h-10 hover:translate-y-[-4px] transition-transform"
                  />
                ))}
              </Avatar.Group>
              <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
                Joined by{" "}
                <span className="text-slate-900 dark:text-white font-extrabold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                  500+
                </span>{" "}
                agencies worldwide
              </p>
            </div>
          </div>

          {/* Hero Desktop Mockup */}
          <div className="lg:col-span-6 relative">
            <InteractiveDashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
};

// Features Section using premium Bento Grid layout
const Features = () => {
  return (
    <section
      id="features"
      className="py-24 px-6 md:px-12 border-t border-slate-200/50 dark:border-zinc-900/50 bg-slate-50/50 dark:bg-zinc-950/40"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
            Why CollaBill?
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mt-4 mb-4 leading-tight">
            Everything you need to <br /> manage your team's billing
          </h2>
          <p className="text-base text-slate-600 dark:text-zinc-400 font-medium">
            Streamlined collaboration, automatic hours accumulation, and clear
            compliance tracking in one dynamic workspace.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1: Kanban Project Management (Lg: col-span-2) */}
          <div className="lg:col-span-2 flex flex-col justify-between p-6 md:p-8 bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 group">
            <div>
              <div className="mb-6 p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <KanbanIcon className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">
                Kanban Project Management
              </h3>
              <p className="text-slate-600 dark:text-zinc-400 font-medium text-sm leading-relaxed max-w-xl mb-6">
                Organize tasks with a simple and powerful Kanban board: To do,
                In progress, Review, Validated. Every card tracks logs
                automatically.
              </p>
            </div>

            {/* Interactive Column UI Preview */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-900 mt-2">
              {[
                { title: "To Do", bg: "bg-slate-300 dark:bg-zinc-700" },
                { title: "In Progress", bg: "bg-blue-500" },
                { title: "Validated", bg: "bg-green-500" },
              ].map((col, i) => (
                <div key={col.title} className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-150 dark:border-zinc-900/50">
                    <span className={cn("w-1.5 h-1.5 rounded-full", col.bg)} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                      {col.title}
                    </span>
                  </div>
                  {i === 1 && (
                    <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 rounded-xl shadow-sm">
                      <span className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                        Tailwind Styling
                      </span>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-2/3" />
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="p-2 bg-green-500/5 dark:bg-green-500/10 border border-green-200 dark:border-green-950 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-bold text-green-700 dark:text-green-400">
                        Database API
                      </span>
                      <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 stroke-[2.5]" />
                    </div>
                  )}
                  {i === 0 && (
                    <div className="p-2 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-xl">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                        Draft Copy
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Collaborator Control */}
          <div className="lg:col-span-1 flex flex-col justify-between p-6 md:p-8 bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 group">
            <div>
              <div className="mb-6 p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <UsersIcon className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">
                Collaborator Control
              </h3>
              <p className="text-slate-600 dark:text-zinc-400 font-medium text-sm leading-relaxed mb-6">
                Invite collaborators, assign tasks, and control access without
                exposing sensitive financial data. Set unique boundaries per
                seat.
              </p>
            </div>

            {/* Stacked Collaborators List UI Preview */}
            <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-900 mt-2">
              {[
                { name: "John Doe", role: "Dev", active: true, imgId: 21 },
                { name: "S. Connor", role: "Design", active: false, imgId: 22 },
                { name: "M. Taylor", role: "Tester", active: true, imgId: 23 },
              ].map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-150 dark:border-zinc-800/60 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      size={20}
                      src={`https://i.pravatar.cc/100?img=${c.imgId}`}
                    />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 font-bold rounded-md bg-slate-100 dark:bg-zinc-850 text-slate-500 dark:text-zinc-400">
                      {c.role}
                    </span>
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        c.active
                          ? "bg-green-500"
                          : "bg-slate-300 dark:bg-zinc-600",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Automatic Billing (Full Width Bento Footer) */}
          <div className="lg:col-span-3 flex flex-col md:flex-row justify-between gap-8 p-6 md:p-8 bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 group">
            <div className="flex-1">
              <div className="mb-6 p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">
                Automatic Billing
              </h3>
              <p className="text-slate-600 dark:text-zinc-400 font-medium text-sm leading-relaxed max-w-xl">
                Daily presence + validated tasks automatically generate clean,
                transparent monthly invoices. Focus on real output, not Excel
                timesheets. No manual calculations required.
              </p>

              <div className="flex flex-wrap gap-2 mt-6">
                {[
                  "Attendance Tracker",
                  "Itemized PDF exports",
                  "No spreadsheet formulas",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="text-xs px-3 py-1 font-bold rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Split billing preview panel */}
            <div className="flex-1 max-w-md w-full bg-slate-50 dark:bg-zinc-950/50 rounded-2xl border border-slate-100 dark:border-zinc-900 p-4 flex flex-col justify-between min-h-[180px]">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-zinc-900">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                  Generated Bill Draft
                </span>
                <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                  AUTO-ACCUMULATING
                </span>
              </div>

              <div className="space-y-2 py-3">
                {[
                  {
                    desc: "Daily Attendance (12 days present)",
                    value: "$2,400.00",
                  },
                  {
                    desc: "Validated Task: Custom Dashboard Hook",
                    value: "$450.00",
                  },
                ].map((item) => (
                  <div key={item.desc} className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">
                      {item.desc}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-150 dark:border-zinc-900 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Amount Due:
                </span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                  $2,850.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Interactive Stepper Showcase: How CollaBill works
const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

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
      className="py-24 px-6 md:px-12 bg-white dark:bg-zinc-950/80 border-t border-slate-200/50 dark:border-zinc-900/50 transition-colors"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Stepper text panel (col-5) */}
          <div className="lg:col-span-5 text-left">
            <span className="text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
              The Workflow
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mt-4 mb-8 leading-tight">
              How CollaBill works
            </h2>

            {/* Steps Container */}
            <div className="flex flex-col gap-4">
              {steps.map((step, i) => {
                const isActive = activeStep === i;
                return (
                  <button
                    key={step.title}
                    onClick={() => setActiveStep(i)}
                    type="button"
                    className={cn(
                      "flex gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 outline-none",
                      isActive
                        ? "bg-blue-500/5 dark:bg-blue-500/10 border-blue-200 dark:border-blue-900/50 shadow-md shadow-blue-500/5 scale-[1.02]"
                        : "bg-transparent border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400",
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <h4
                        className={cn(
                          "text-base font-bold mb-1",
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-800 dark:text-zinc-200",
                        )}
                      >
                        {step.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepper visual viewport (col-7) */}
          <div className="lg:col-span-7 w-full h-full min-h-[380px] flex items-center">
            <div className="w-full p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/20 shadow-xl transition-all duration-500 flex flex-col justify-center min-h-[360px]">
              {/* Dynamic Screens based on activeStep */}
              {activeStep === 0 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-250 dark:border-zinc-800">
                    <Sliders className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                      Rule Parameters Form
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                        Resource Name
                      </span>
                      <div className="px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Jessica Parker
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                        Resource Role
                      </span>
                      <div className="px-3 py-2 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg text-xs font-semibold text-slate-800 dark:text-zinc-200">
                        Senior UI Engineer
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500">
                      Billing Setup
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="px-3 py-3 border-2 border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                        <span>Hourly Task Rate</span>
                        <span>$55 / hr</span>
                      </div>
                      <div className="px-3 py-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center justify-between opacity-80">
                        <span>Daily Presence</span>
                        <span>$350 / day</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Save Billing Rules
                  </button>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-4 animate-fadeIn text-left">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-250 dark:border-zinc-800">
                    <KanbanIcon className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                      Assign To Card Dialog
                    </span>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm max-w-sm mx-auto">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      HIGH PRIORITY
                    </span>
                    <h5 className="text-sm font-black mt-2 mb-4 text-slate-800 dark:text-zinc-200">
                      Optimize Build Bundles
                    </h5>

                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-1">
                      Select Assignee
                    </span>
                    <div className="flex items-center justify-between p-2.5 border border-blue-500 dark:border-blue-500 bg-blue-50/10 dark:bg-blue-950/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Avatar
                          size={20}
                          src="https://i.pravatar.cc/100?img=33"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          David Geller (Senior Dev)
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4 animate-fadeIn text-left">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-250 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                        Attendance Verification Tracker
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-900/30">
                      AUG 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 max-w-sm mx-auto pt-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (dayLabel) => (
                        <span
                          key={dayLabel}
                          className="text-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 py-1"
                        >
                          {dayLabel.charAt(0)}
                        </span>
                      ),
                    )}
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((day) => {
                      const isPresent = day < 10 && day !== 6 && day !== 7;
                      const isWeekend =
                        day === 6 || day === 7 || day === 13 || day === 14;
                      return (
                        <div
                          key={day}
                          className={cn(
                            "aspect-square rounded-lg flex items-center justify-center text-xs font-bold border transition-colors",
                            isPresent
                              ? "bg-green-500 text-white border-green-500 shadow-md shadow-green-500/10"
                              : isWeekend
                                ? "bg-slate-50 dark:bg-zinc-900/50 text-slate-300 dark:text-zinc-700 border-slate-100 dark:border-zinc-900"
                                : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-800 hover:border-green-500",
                          )}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4 animate-fadeIn text-left relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-250 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                        Invoice PDF Compiler
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                      INV-2026-102
                    </span>
                  </div>

                  <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-150 dark:border-zinc-850 space-y-3 shadow-sm relative">
                    {/* Paid Stamp Decor */}
                    <div className="absolute right-4 top-4 border-4 border-green-500 text-green-500 px-3 py-1 text-xs font-black rounded-lg rotate-12 uppercase tracking-widest bg-white dark:bg-zinc-900 z-10 select-none shadow-md">
                      Paid via ACH
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">
                      ISSUED BY:{" "}
                      <b className="text-slate-700 dark:text-zinc-300">
                        CollaBill Corp
                      </b>
                    </div>

                    <div className="border-t border-b border-slate-100 dark:border-zinc-800/80 py-2.5 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          UI Tasks (30 hrs)
                        </span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">
                          $1,650.00
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Attendance (10 days)
                        </span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200 font-semibold">
                          $3,500.00
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Amount Transferred:
                      </span>
                      <span className="text-sm font-black text-green-600 dark:text-green-500">
                        $5,150.00
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Accordion-style modern FAQ section
const FAQ = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does automatic billing calculate rates?",
      a: "CollaBill monitors attendance logs and validated tasks for your collaborators. Depending on their customized rate scheme (hourly or daily), the billing engine automatically accumulates items to draft clean invoices dynamically at each month-end.",
    },
    {
      q: "Can I set different rates for different collaborators?",
      a: "Yes! Rates are fully dynamic and configurable per seat. You can invite multiple roles, from flat-rate designers to hourly developers, and easily scale budgets dynamically without breaking any calculations.",
    },
    {
      q: "Is my financial data secure and hidden from collaborators?",
      a: "Confidentiality is a priority. Collaborators only gain visibility into tasks they are assigned to, and their own personal hours/invoices. Global organization metrics, workspace margins, and other members' rates are strictly hidden from them.",
    },
    {
      q: "Can I export invoices or sync with accounting software?",
      a: "Yes. Invoices are automatically generated as beautifully-typeset, corporate-standard PDFs. In addition, you can export structured billing ledgers as CSV or JSON to effortlessly import into your primary tax/accounting software.",
    },
  ];

  return (
    <section
      id="faq"
      className="py-24 px-6 md:px-12 bg-slate-50/50 dark:bg-zinc-950/40 border-t border-slate-200/50 dark:border-zinc-900/50"
    >
      <div className="max-w-4xl mx-auto text-left">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-blue-600 dark:text-blue-400 font-bold tracking-wider uppercase text-xs px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
            Frictionless Answers
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mt-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div
                key={faq.q}
                className="bg-white dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 dark:text-zinc-200 cursor-pointer outline-none hover:bg-slate-50/50 dark:hover:bg-zinc-900"
                >
                  <span className="text-sm md:text-base pr-4">{faq.q}</span>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300",
                      isOpen && "rotate-90 text-blue-500",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-xs md:text-sm text-slate-500 dark:text-zinc-400 font-medium leading-relaxed border-t border-slate-100 dark:border-zinc-900 pt-3.5">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Premium CTA Section
const CTA = () => {
  return (
    <section className="py-24 px-6 md:px-12 bg-slate-950 dark:bg-zinc-950 relative overflow-hidden border-t border-zinc-900">
      {/* Decorative Grid Lines */}
      <svg
        className="absolute inset-0 -z-10 h-full w-full stroke-zinc-900 [mask-image:radial-gradient(100%_100%_at_center,white,transparent)]"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="cta-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            x="50%"
            y="-1"
          >
            <path d="M.5 40V.5H40" fill="none" />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          strokeWidth="0"
          fill="url(#cta-grid)"
        />
      </svg>

      {/* Radiant Glow Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight tracking-tight">
          Ready to simplify your workflow?
        </h2>
        <p className="text-zinc-400 text-base md:text-lg mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
          Join hundreds of teams who have reclaimed their time with automated
          billing and project management. Get fully operational under 5 minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="large"
            className="h-14 px-8 rounded-2xl text-lg font-bold bg-blue-600 dark:bg-blue-500 text-white border-none hover:!bg-blue-700 hover:scale-[1.02] active:scale-98 transition-all shadow-xl shadow-blue-500/20"
          >
            Create your account
          </Button>
          <Button
            size="large"
            ghost
            className="h-14 px-8 rounded-2xl text-lg font-bold text-white border-zinc-700 hover:border-white hover:!bg-white/5 hover:scale-[1.02] active:scale-98 transition-all"
          >
            Schedule a demo
          </Button>
        </div>
      </div>
    </section>
  );
};

// Footer Section
const MainFooter = () => {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSuccess(true);
      setEmail("");
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <Footer className="py-16 px-6 md:px-12 border-t bg-white dark:bg-zinc-950 border-slate-200/50 dark:border-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 text-left pb-12 border-b border-slate-200/50 dark:border-zinc-900/50">
          <div className="md:col-span-4">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign className="text-white text-base stroke-[2.5]" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                CollaBill
              </span>
            </Link>
            <p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm leading-relaxed max-w-sm mb-6 font-medium">
              The collaborative billing platform for modern agencies and
              freelancers. Simplify your workflow and focus on what matters
              most.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="GitHub link"
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:text-blue-500 rounded-lg text-slate-400 cursor-pointer transition-colors"
              >
                <GitBranch className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Support mail"
                className="p-2 border border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:text-blue-500 rounded-lg text-slate-400 cursor-pointer transition-colors"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="col-span-6 md:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-6">
              Product
            </h4>
            <ul className="space-y-4 list-none p-0 text-xs font-semibold">
              <li>
                <Link
                  href="#features"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Integrations
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-6 md:col-span-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-6">
              Resources
            </h4>
            <ul className="space-y-4 list-none p-0 text-xs font-semibold">
              <li>
                <Link
                  href="#"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-6">
              Stay Updated
            </h4>
            <p className="text-slate-500 dark:text-zinc-400 text-xs md:text-sm mb-4 leading-relaxed font-medium">
              Get the latest updates and product releases directly in your
              inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
              />
              <Button
                type="primary"
                htmlType="submit"
                className="h-9 md:h-10 rounded-xl px-4 font-bold bg-blue-600 dark:bg-blue-500 shrink-0"
              >
                Subscribe
              </Button>
            </form>
            {success && (
              <p className="text-green-600 dark:text-green-400 text-xs font-bold mt-2.5 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3.5 h-3.5" /> Thank you for subscribing!
              </p>
            )}
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
            © {new Date().getFullYear()} CollaBill — All rights reserved
          </span>
          <div className="flex gap-6 text-xs font-semibold">
            <Link
              href="/privacy"
              className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
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
      <Layout className="min-h-screen bg-transparent transition-colors duration-300">
        <LandingPageSEO />
        <Navbar />
        <Content>
          <Hero />
          <Features />
          <HowItWorks />
          <FAQ />
          <CTA />
        </Content>
        <MainFooter />
      </Layout>
    </ConfigProvider>
  );
};

export default LandingPage;
