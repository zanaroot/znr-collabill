"use client";

import { useState } from "react";
import { useMeetings } from "../_hooks/use-meetings";
import { CallHistoryList } from "./call-history-list";
import { CreateMeetingModal } from "./create-meeting-modal";
import { MeetingDetailDrawer } from "./meeting-detail-drawer";
import { MeetingList } from "./meeting-list";

export const MeetingsView = () => {
  const { data: meetings, isLoading } = useMeetings();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null,
  );

  return (
    <div style={{ padding: 24, display: "grid", gap: 24 }}>
      <MeetingList
        meetings={meetings ?? []}
        isLoading={isLoading}
        onCreate={() => setCreateOpen(true)}
        onOpenDetail={(meeting) => setSelectedMeetingId(meeting.id)}
      />
      <CallHistoryList />
      <CreateMeetingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(meetingId) => {
          setCreateOpen(false);
          setSelectedMeetingId(meetingId);
        }}
      />
      <MeetingDetailDrawer
        meetingId={selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
      />
    </div>
  );
};
