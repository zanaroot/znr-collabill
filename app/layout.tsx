import { App } from "antd";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AntProvider } from "@/packages/antd";
import { ReactQueryProvider } from "@/packages/react-query";
import { ThemeProvider } from "./_components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  title: {
    default: "CollaBill - Collaborative Billing & Project Management for Teams",
    template: "%s | CollaBill",
  },
  description:
    "CollaBill helps agencies and freelancers manage projects, track tasks, and automate invoicing. Simplify collaborator billing with automatic monthly invoices.",
  keywords: [
    "collaborative billing software",
    "project billing tool",
    "invoice automation platform",
    "team invoicing software",
    "freelancer invoicing tool",
    "client billing management",
    "project management with billing",
    "billing software for agencies",
    "online invoicing app",
    "SaaS billing solution",
  ],
  authors: [{ name: "CollaBill" }],
  creator: "CollaBill",
  publisher: "CollaBill",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "CollaBill",
    title: "CollaBill - Collaborative Billing & Project Management for Teams",
    description:
      "Manage projects, track tasks, and automate invoicing for your team. Built for agencies and freelancers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CollaBill - Project Billing Made Simple",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CollaBill - Collaborative Billing & Project Management",
    description: "Automate invoicing and manage project billing for your team.",
    images: ["/og-image.png"],
    creator: "@collabill",
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    languages: {
      en: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  return (
    <html lang="en">
      <ThemeProvider>
        <AntProvider>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased `}
          >
            <ReactQueryProvider>
              <App>{children}</App>
            </ReactQueryProvider>
          </body>
        </AntProvider>
      </ThemeProvider>
    </html>
  );
};

export default RootLayout;
