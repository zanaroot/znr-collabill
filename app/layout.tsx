import { AntProvider } from "@/app/_providers/ant-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactNode } from "react";
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
  title: "Collabill",
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
          {children}
        </body>
      </AntProvider>
    </html>
  );
};

export default RootLayout;
