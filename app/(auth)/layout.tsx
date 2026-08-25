import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/http/actions/get-current-user.action";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  const user = await getCurrentUser();

  if (user?.organizationId) {
    return redirect("/task-board");
  }

  return (
    <div className="auth-layout">
      <div className="auth-branding">
        <div className="auth-branding-content">
          <div className="auth-logo">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Collabill logo"
              role="img"
            >
              <rect
                width="48"
                height="48"
                rx="12"
                fill="white"
                fillOpacity="0.15"
              />
              <path
                d="M14 24C14 18.477 18.477 14 24 14C29.523 14 34 18.477 34 24C34 29.523 29.523 34 24 34"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M24 34V44"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="24" cy="24" r="4" fill="white" />
            </svg>
          </div>
          <h1 className="auth-brand-title">Collabill</h1>
          <p className="auth-brand-subtitle">
            Streamline your team's collaboration and billing workflow
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-label="Checkmark"
                  role="img"
                >
                  <path
                    d="M16.667 5L7.5 14.167L3.333 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Task management & project tracking</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-label="Checkmark"
                  role="img"
                >
                  <path
                    d="M16.667 5L7.5 14.167L3.333 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Automated invoicing & payments</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-label="Checkmark"
                  role="img"
                >
                  <path
                    d="M16.667 5L7.5 14.167L3.333 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Real-time team collaboration</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-container">{children}</div>
    </div>
  );
};

export default AuthLayout;
