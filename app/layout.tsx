import { App } from "antd";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { AntProvider } from "@/packages/antd";
import { ReactQueryProvider } from "@/packages/react-query";
import { ThemeProvider } from "./_components/theme-provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SentryProvider } from "@/app/sentry-povider";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  INDEXABLE_ROBOTS,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "business software",
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
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    creator: TWITTER_HANDLE,
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <Analytics />
        <SentryProvider>
          <ThemeProvider>
            <AntProvider>
              <ReactQueryProvider>
                <App>{children}</App>
              </ReactQueryProvider>
            </AntProvider>
          </ThemeProvider>
        </SentryProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZBL7KR79SS"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-ZBL7KR79SS');
          `}
        </Script>
      </body>
    </html>
  );
};

export default RootLayout;
