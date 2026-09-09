import { Typography } from "antd";
import Link from "next/link";

export const SuccessForm = () => (
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
        Password updated
      </Typography.Title>
      <Typography.Text type="secondary" className="auth-card-subtitle">
        Your password has been successfully updated. You can now sign in with
        your new password.
      </Typography.Text>
    </div>

    <Link href="/sign-in" className="auth-submit-btn-link">
      Sign in
    </Link>
  </div>
);
