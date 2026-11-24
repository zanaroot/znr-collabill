import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt =
  "CollaBill — collaborative billing and project management for teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "flex-start",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
        height: "100%",
        justifyContent: "center",
        padding: "80px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 20,
          marginBottom: 36,
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#2563eb",
            borderRadius: 24,
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            height: 96,
            justifyContent: "center",
            width: 96,
          }}
        >
          $
        </div>
        <span style={{ fontSize: 52, fontWeight: 800 }}>{SITE_NAME}</span>
      </div>
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          letterSpacing: -2,
          lineHeight: 1.1,
          maxWidth: 900,
        }}
      >
        Manage projects. Pay collaborators. Without the headache.
      </div>
      <div
        style={{
          color: "#cbd5e1",
          fontSize: 30,
          lineHeight: 1.4,
          marginTop: 28,
          maxWidth: 900,
        }}
      >
        Kanban task tracking, attendance, and automatic monthly invoices for
        agencies and freelancers.
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 44 }}>
        {["Kanban boards", "Automatic billing", "Team collaboration"].map(
          (label) => (
            <div
              key={label}
              style={{
                background: "rgba(37, 99, 235, 0.25)",
                border: "1px solid rgba(148, 163, 184, 0.4)",
                borderRadius: 999,
                color: "#dbeafe",
                display: "flex",
                fontSize: 24,
                fontWeight: 600,
                padding: "10px 22px",
              }}
            >
              {label}
            </div>
          ),
        )}
      </div>
    </div>,
    size,
  );
}
