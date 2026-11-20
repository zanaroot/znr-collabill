"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const SAFE_BACK_PATHS = new Set([
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/sign-up/owner",
  "/forgot-password",
  "/reset-password",
  "/create-account",
  "/verify-email",
]);

const isSafeBackPath = (path: string) =>
  SAFE_BACK_PATHS.has(path) || path.startsWith("/sign-up/");

export const AuthBackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname !== currentPathRef.current) {
      previousPathRef.current = currentPathRef.current;
      currentPathRef.current = pathname;
    }
  }, [pathname]);

  const handleBack = () => {
    const referrerUrl = document.referrer ? new URL(document.referrer) : null;
    const hasSafePreviousPage =
      previousPathRef.current !== null &&
      isSafeBackPath(previousPathRef.current);
    const hasSafeReferrer =
      referrerUrl !== null &&
      referrerUrl.origin === window.location.origin &&
      isSafeBackPath(referrerUrl.pathname);

    if (window.history.length > 1 && (hasSafePreviousPage || hasSafeReferrer)) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <Button
      type="text"
      icon={<ArrowLeftOutlined />}
      className="auth-back-button"
      aria-label="Back"
      onClick={handleBack}
    >
      Back
    </Button>
  );
};
