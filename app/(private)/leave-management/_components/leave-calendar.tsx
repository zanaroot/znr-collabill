"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Calendar, Flex } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { client } from "@/packages/hono";

interface LeaveCalendarProps {
  onRequestLeave: () => void;
}

export const LeaveCalendar = ({ onRequestLeave }: LeaveCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

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
    enabled: !!startDate && !!endDate,
  });

  const presenceDates = useMemo(() => {
    const presences =
      myPresences && !("error" in myPresences) ? myPresences : [];
    return new Set(presences.map((p) => p.date));
  }, [myPresences]);

  interface LeaveListItem {
    id: string;
    type: "success" | "warning" | "error";
    content: string;
  }

  const getListData = (value: Dayjs): LeaveListItem[] => {
    const requests = myRequests && !("error" in myRequests) ? myRequests : [];

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

    return (
      <div
        style={{
          backgroundColor: hasPresence ? "#108ee9" : undefined,
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
              <Badge status={item.type} text={item.content} />
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
        <Flex gap="middle">
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
        </Flex>
        <Button type="primary" onClick={onRequestLeave}>
          Request Leave
        </Button>
      </Flex>
      <Calendar cellRender={dateCellRender} onPanelChange={handlePanelChange} />
    </div>
  );
};
