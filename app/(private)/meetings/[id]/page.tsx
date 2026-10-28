import { notFound } from "next/navigation";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import { findMeetingByIdWithDetails } from "@/http/repositories/meeting.repository";
import { MeetingRoomClient } from "./_components/meeting-room-client";

const MeetingRoomPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user?.organizationId) {
    notFound();
  }

  const meeting = await findMeetingByIdWithDetails(id);

  if (!meeting || meeting.organizationId !== user.organizationId) {
    notFound();
  }

  return (
    <div style={{ height: "100%" }}>
      <MeetingRoomClient meetingId={meeting.id} meetingTitle={meeting.title} />
    </div>
  );
};

export default MeetingRoomPage;
