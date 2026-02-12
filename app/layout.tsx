import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AntProvider } from "@/packages/antd";
import { ReactQueryProvider } from "@/packages/react-query";
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
  title: "Collabill - Work together. Get paid right.",
  description: "Collabill — Work together. Get paid right.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  return (
    <html lang="en">
      <AntProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased `}
        >
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </body>
      </AntProvider>
    </html>
  );
};

export default RootLayout;
