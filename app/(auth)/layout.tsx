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
              width="56"
              height="56"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Collabill logo"
              role="img"
            >
              <rect
                width="56"
                height="56"
                rx="14"
                fill="white"
                fillOpacity="0.12"
              />
              <path
                d="M16 28C16 21.373 21.373 16 28 16C34.627 16 40 21.373 40 28C40 34.627 34.627 40 28 40"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M28 40V52"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="28" cy="28" r="5" fill="white" />
            </svg>
          </div>
          <h1 className="auth-brand-title">Collabill</h1>
          <p className="auth-brand-subtitle">
            Streamline your team&apos;s collaboration and billing workflow
          </p>
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <svg
                  width="18"
                  height="18"
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
                  width="18"
                  height="18"
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
                  width="18"
                  height="18"
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
