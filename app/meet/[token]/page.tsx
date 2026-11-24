import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { GuestJoin } from "./_components/guest-join";

export const metadata: Metadata = {
  title: "Join Meeting",
  robots: NOINDEX_ROBOTS,
};

const GuestMeetingPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <GuestJoin token={token} />
    </div>
  );
};

export default GuestMeetingPage;
