"use client";

import { Button, Result, Spin, Typography } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthBackButton } from "@/app/_components/auth-back-button";
import { client } from "@/packages/hono";

type VerificationStatus = "verified" | "expired" | "invalid";

type VerifyEmailResponse = {
  success?: boolean;
  status?: VerificationStatus;
  error?: string;
};

const parseStatus = (value: string | null): VerificationStatus | null => {
  if (value === "verified" || value === "expired" || value === "invalid") {
    return value;
  }

  return null;
};

const VerifyEmailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const [status, setStatus] = useState<VerificationStatus | null>(
    parseStatus(searchParams.get("status")),
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (status === "verified") {
      router.push("/dashboard");
    } else {
      router.push("/sign-in");
    }
  };

  const handleVerify = async () => {
    if (!token) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await client.api.auth["email-verification"].verify.$post({
        json: { token },
      });
      const result = (await res.json()) as VerifyEmailResponse;

      if (result.status) {
        setStatus(result.status);
      } else {
        setStatus(res.ok ? "verified" : "invalid");
      }
    } catch {
      setError(
        "We couldn't verify your email right now. Please try again in a moment.",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (status === "verified") {
    return (
      <Result
        status="success"
        title="Email verified successfully!"
        subTitle="Your email address has been verified. Your Collabill account is ready to use."
        extra={
          <Button type="primary" size="large" onClick={handleContinue}>
            Go to dashboard
          </Button>
        }
      />
    );
  }

  if (status === "expired") {
    return (
      <Result
        status="warning"
        title="Verification link expired"
        subTitle="This verification link has expired. Please request a new verification email."
        extra={
          <Button type="primary" onClick={handleContinue}>
            Continue to sign in
          </Button>
        }
      />
    );
  }

  if (status === "invalid") {
    return (
      <Result
        status="error"
        title="Invalid verification link"
        subTitle="This link is invalid or has already been used. Please request a new verification email if necessary."
        extra={
          <Button type="primary" onClick={handleContinue}>
            Continue to sign in
          </Button>
        }
      />
    );
  }

  if (token) {
    return (
      <Result
        status="info"
        title="Confirm your email address"
        subTitle="Click the button below to finish verifying your email address."
        extra={
          <Button
            type="primary"
            size="large"
            loading={isVerifying}
            onClick={handleVerify}
          >
            Verify my email
          </Button>
        }
      >
        {error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : null}
      </Result>
    );
  }

  return (
    <Result
      status="info"
      title="Email verification"
      subTitle="Open the verification link from your email to verify your address."
      extra={
        <Button type="primary" onClick={() => router.push("/sign-in")}>
          Continue to sign in
        </Button>
      }
    />
  );
};

export default function VerifyEmailPage() {
  return (
    <main className="auth-form-container auth-verification-container">
      <div className="auth-page-content">
        <AuthBackButton />
        <div className="auth-card">
          <Suspense
            fallback={
              <div className="flex min-h-48 items-center justify-center">
                <Spin size="large" />
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
