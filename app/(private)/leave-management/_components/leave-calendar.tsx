"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Calendar, Flex } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { client } from "@/packages/hono";

interface LeaveCalendarProps {
  onRequestLeave: () => void;
}

export const LeaveCalendar = ({ onRequestLeave }: LeaveCalendarProps) => {
  const { data: myRequests } = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: async () => {
      const res = await client.api["leave-requests"].my.$get();
      return res.json();
    },
  });

  interface LeaveListItem {
    id: string;
    type: "success" | "warning" | "error";
    content: string;
  }

  const getListData = (value: Dayjs): LeaveListItem[] => {
    const requests = myRequests && !("error" in myRequests) ? myRequests : [];

    // Find requests that cover this date
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
    return (
      <ul className="events" style={{ listStyle: "none", padding: 0 }}>
        {listData.map((item) => (
          <li key={item.id}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <Flex justify="space-between" align="center" className="mb-4">
        <Flex gap="middle">
          <Badge status="success" text="Approved" />
          <Badge status="warning" text="Pending" />
          <Badge status="error" text="Rejected" />
          <Badge status="default" text="Weekend" />
        </Flex>
        <Button type="primary" onClick={onRequestLeave}>
          Request Leave
        </Button>
      </Flex>
      <Calendar cellRender={dateCellRender} />
    </div>
  );
};
