"use client";

import { Button, Result } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const VerifyEmailContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const status = searchParams.get("status");

    const handleContinue = () => {
        if (status === "verified") {
            router.push("/dashboard");
        } else {
            router.push("/sign-in");
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

    return (
        <Result
            status="error"
            title="Verification failed"
            subTitle="We could not complete the verification. Please try again later."
            extra={
                <Button type="primary" onClick={handleContinue}>
                    Continue
                </Button>
            }
        />
    );
};

export default function VerifyEmailPage() {
    return (
        <div className="auth-card">
            <Suspense fallback={<Result title="Checking verification status..." />}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}