"use client";

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Calendar, Flex, Segmented, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import type { PresenceStatus } from "@/http/models/presence.model";
import { toReadable } from "@/lib/text";
import { client } from "@/packages/hono";
import {
  ManagePresenceModal,
  type ManagePresenceTarget,
} from "./manage-presence-modal";

interface LeaveCalendarProps {
  onRequestLeave: () => void;
  isAdmin?: boolean;
  isLeaveDisabled?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  OFFICE: "#52c41a",
  REMOTE: "#1890ff",
  HALF_DAY: "#722ed1",
  SICK: "#fa541c",
  VACATION: "#eb2f96",
  ON_LEAVE: "#faad14",
};

export const LeaveCalendar = ({
  onRequestLeave,
  isAdmin = false,
  isLeaveDisabled = false,
}: LeaveCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<"my" | "team">("my");
  const [manageTarget, setManageTarget] = useState<ManagePresenceTarget | null>(
    null,
  );

  const startDate = currentMonth.startOf("month").format("YYYY-MM-DD");
  const endDate = currentMonth.endOf("month").format("YYYY-MM-DD");

  const { data: myRequests } = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: async () => {
      const res = await client.api["leave-requests"].my.$get();
      return res.json();
    },
  });

  const { data: myPresences } = useQuery({
    queryKey: ["my-presences", startDate, endDate],
    queryFn: async () => {
      const res = await client.api.presence.my.$get({
        query: { startDate, endDate },
      });
      return res.json();
    },
    enabled: !!startDate && !!endDate && viewMode === "my",
  });

  const { data: allPresences } = useQuery({
    queryKey: ["all-presences", startDate, endDate],
    queryFn: async () => {
      const res = await client.api.presence.all.$get({
        query: { startDate, endDate },
      });
      return res.json();
    },
    enabled: !!startDate && !!endDate && isAdmin && viewMode === "team",
  });

  const presenceDates = useMemo(() => {
    const presences =
      myPresences && !("error" in myPresences) ? myPresences : [];
    return new Set(presences.map((p) => p.date));
  }, [myPresences]);

  const teamPresencesByDate = useMemo(() => {
    const presences =
      allPresences && !("error" in allPresences) ? allPresences : [];
    const byDate: Record<
      string,
      Array<{ userId: string; userName: string; status: PresenceStatus }>
    > = {};
    for (const p of presences) {
      if (!byDate[p.date]) {
        byDate[p.date] = [];
      }
      byDate[p.date].push({
        userId: p.userId,
        userName: p.userName ?? "Unknown",
        status: p.status ?? "OFFICE",
      });
    }
    return byDate;
  }, [allPresences]);

  interface LeaveListItem {
    id: string;
    type: "success" | "warning" | "error";
    content: string;
    color?: string;
    userId?: string;
    userName?: string;
    status?: PresenceStatus;
  }

  const getListData = (value: Dayjs): LeaveListItem[] => {
    const requests = myRequests && !("error" in myRequests) ? myRequests : [];
    const dateStr = value.format("YYYY-MM-DD");

    if (isAdmin && viewMode === "team") {
      const dayPresences = teamPresencesByDate[dateStr] ?? [];
      return dayPresences.map((p, idx) => ({
        id: `${dateStr}-${idx}`,
        type: "warning" as const,
        content: `${p.userName} (${toReadable(p.status)})`,
        color: STATUS_COLORS[p.status] ?? "#1890ff",
        userId: p.userId,
        userName: p.userName,
        status: p.status,
      }));
    }

    const dayRequests = requests.filter((r) => {
      const start = dayjs(r.startDate);
      const end = dayjs(r.endDate);
      return (
        (value.isAfter(start) || value.isSame(start, "day")) &&
        (value.isBefore(end) || value.isSame(end, "day"))
      );
    });

    return dayRequests.map((r) => ({
      id: r.id,
      type:
        r.status === "APPROVED"
          ? "success"
          : r.status === "PENDING"
            ? "warning"
            : "error",
      content:
        r.type === "FULL_DAY"
          ? "Leave"
          : r.type === "HALF_DAY_AM"
            ? "AM Leave"
            : "PM Leave",
    }));
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    const dateStr = value.format("YYYY-MM-DD");
    const hasPresence = presenceDates.has(dateStr);

    const isTeamView = isAdmin && viewMode === "team";

    return (
      <div
        style={{
          backgroundColor: hasPresence && !isTeamView ? "#108ee9" : undefined,
          height: "100%",
          padding: "2px 4px",
          borderRadius: "4px",
        }}
      >
        <ul
          className="events"
          style={{ listStyle: "none", padding: 0, margin: 0 }}
        >
          {listData.map((item) => {
            const target =
              isTeamView && item.userId && item.userName && item.status
                ? {
                    userId: item.userId,
                    userName: item.userName,
                    date: dateStr,
                    status: item.status,
                  }
                : null;

            return (
              <li key={item.id}>
                {isTeamView ? (
                  <Tooltip title={item.content}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11 }}>{item.content}</span>
                      {target && (
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined style={{ fontSize: 12 }} />}
                          title="Manage presence"
                          onClick={(event) => {
                            event.stopPropagation();
                            setManageTarget(target);
                          }}
                        />
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  <Badge status={item.type} text={item.content} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const handlePanelChange = (value: Dayjs) => {
    setCurrentMonth(value);
  };

  const handleSelectDate = (date: Dayjs) => {
    if (isAdmin && viewMode === "team") {
      setManageTarget({ date: date.format("YYYY-MM-DD") });
    }
  };

  const handleMarkPresence = () => {
    const defaultDate = currentMonth.isSame(dayjs(), "month")
      ? dayjs()
      : currentMonth.startOf("month");

    setManageTarget({ date: defaultDate.format("YYYY-MM-DD") });
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className="mb-4">
        <Flex gap="middle" align="center">
          {isAdmin && (
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as "my" | "team")}
              options={[
                { label: "My Calendar", value: "my" },
                { label: "Team Calendar", value: "team" },
              ]}
            />
          )}
          {viewMode === "my" && (
            <>
              <Badge status="success" text="Approved" />
              <Badge status="warning" text="Pending" />
              <Badge status="error" text="Rejected" />
              <Badge status="default" text="Weekend" />
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: "#108ee9",
                  borderRadius: 2,
                  border: "1px solid #b7eb8f",
                  marginLeft: 8,
                }}
              />
              <span style={{ marginLeft: 4 }}>Present</span>
            </>
          )}
          {isAdmin && viewMode === "team" && (
            <Flex gap="middle">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <Flex key={status} gap={4} align="center">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                  <span style={{ fontSize: 12 }}>{toReadable(status)}</span>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
        {viewMode === "my" && (
          <Button
            type="primary"
            onClick={onRequestLeave}
            disabled={isLeaveDisabled}
            title={
              isLeaveDisabled
                ? "Leave requests are disabled when Paid as Worked policy is active"
                : undefined
            }
          >
            Request Leave
          </Button>
        )}
        {isAdmin && viewMode === "team" && (
          <Button icon={<PlusOutlined />} onClick={handleMarkPresence}>
            Mark Presence
          </Button>
        )}
      </Flex>
      <Calendar
        cellRender={dateCellRender}
        onPanelChange={handlePanelChange}
        onSelect={handleSelectDate}
      />

      <ManagePresenceModal
        open={!!manageTarget}
        target={manageTarget}
        onClose={() => setManageTarget(null)}
      />
    </div>
  );
};
