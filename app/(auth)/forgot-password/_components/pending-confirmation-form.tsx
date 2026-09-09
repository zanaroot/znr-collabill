import { Typography } from "antd";
import Link from "next/link";

export const PendingConfirmationForm = () => (
  <div className="auth-card">
    <div className="auth-card-header">
      <div className="auth-icon-wrapper success">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label="Success"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      </div>
      <Typography.Title level={2} className="auth-card-title">
        Check your email
      </Typography.Title>
      <Typography.Text type="secondary" className="auth-card-subtitle">
        We&apos;ve sent a password reset link to your email address. Please
        check your inbox and follow the instructions.
      </Typography.Text>
    </div>

    <div className="auth-card-footer">
      <Link href="/sign-in" className="auth-back-link">
        Back to sign in
      </Link>
    </div>
  </div>
);
