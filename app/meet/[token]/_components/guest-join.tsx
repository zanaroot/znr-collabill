"use client";

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Result,
  Spin,
  Typography,
} from "antd";
import { useState } from "react";
import { LiveKitMeetingView } from "@/app/(private)/_components/calls/livekit-meeting-view";
import {
  useGuestJoinMeeting,
  usePublicMeetingInfo,
} from "@/app/(private)/meetings/_hooks/use-meetings";

export const GuestJoin = ({ token }: { token: string }) => {
  const { data: meetingInfo, isLoading, error } = usePublicMeetingInfo(token);
  const guestJoin = useGuestJoinMeeting(token);
  const [joined, setJoined] = useState(false);
  const [form] = Form.useForm();

  const handleJoin = async () => {
    const values = await form.validateFields();
    await guestJoin.mutateAsync(values.name);
    setJoined(true);
  };

  if (error) {
    return (
      <Result
        status="404"
        title="Invalid meeting link"
        subTitle={(error as Error).message}
      />
    );
  }

  if (guestJoin.error) {
    return (
      <Result
        status="warning"
        title="Unable to join"
        subTitle={(guestJoin.error as Error).message}
        extra={
          <Button onClick={() => window.location.reload()}>Try again</Button>
        }
      />
    );
  }

  if (joined && guestJoin.data) {
    return (
      <LiveKitMeetingView
        serverUrl={guestJoin.data.serverUrl}
        token={guestJoin.data.token}
        onDisconnected={() => setJoined(false)}
      />
    );
  }

  if (isLoading || !meetingInfo) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card style={{ maxWidth: 420, margin: "48px auto" }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        {meetingInfo.title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        You are joining as a guest. Enter your name to join the meeting.
      </Typography.Paragraph>
      <Alert
        type="info"
        showIcon
        message="Guests only have access to this meeting."
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={handleJoin}>
        <Form.Item
          name="name"
          label="Your name"
          rules={[
            { required: true, message: "Please enter your name" },
            { max: 80 },
          ]}
        >
          <Input placeholder="Jane Doe" autoFocus />
        </Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={guestJoin.isPending}
        >
          Join meeting
        </Button>
      </Form>
    </Card>
  );
};
