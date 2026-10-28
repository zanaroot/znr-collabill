import { GuestJoin } from "./_components/guest-join";

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
