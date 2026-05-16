"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Calendar, Flex, Segmented, Tooltip } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { toReadable } from "@/lib/text";
import { client } from "@/packages/hono";

interface LeaveCalendarProps {
  onRequestLeave: () => void;
  isAdmin?: boolean;
  isLeaveDisabled?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  OFFICE: "#52c41a",
  REMOTE: "#1890ff",
  ON_SITE: "#722ed1",
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
      Array<{ userName: string; status: string }>
    > = {};
    for (const p of presences) {
      if (!byDate[p.date]) {
        byDate[p.date] = [];
      }
      byDate[p.date].push({
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
  }

  const getListData = (value: Dayjs): LeaveListItem[] => {
    const requests = myRequests && !("error" in myRequests) ? myRequests : [];
    const dateStr = value.format("YYYY-MM-DD");

    if (isAdmin && viewMode === "team") {
      const dayPresences = teamPresencesByDate[dateStr] ?? [];
      return dayPresences.map((p, idx) => ({
        id: `${dateStr}-${idx}`,
        type: "processing" as const,
        content: `${p.userName} (${toReadable(p.status)})`,
        color: STATUS_COLORS[p.status] ?? "#1890ff",
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
          {listData.map((item) => (
            <li key={item.id}>
              {isTeamView ? (
                <Tooltip title={item.content}>
                  <div
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: item.color,
                      marginRight: 4,
                    }}
                  />
                  <span style={{ fontSize: 11 }}>{item.content}</span>
                </Tooltip>
              ) : (
                <Badge status={item.type} text={item.content} />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handlePanelChange = (value: Dayjs) => {
    setCurrentMonth(value);
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
      </Flex>
      <Calendar cellRender={dateCellRender} onPanelChange={handlePanelChange} />
    </div>
  );
};
