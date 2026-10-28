"use client";

import { DatePicker, Form, Input, Modal, Switch } from "antd";
import { useCreateMeeting } from "../_hooks/use-meetings";

export const CreateMeetingModal = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (meetingId: string) => void;
}) => {
  const [form] = Form.useForm();
  const createMeeting = useCreateMeeting();

  const handleOk = async () => {
    const values = await form.validateFields();

    const meeting = await createMeeting.mutateAsync({
      title: values.title,
      scheduledAt: values.scheduledAt
        ? values.scheduledAt.toISOString()
        : undefined,
      expiresAt: values.expiresAt ? values.expiresAt.toISOString() : undefined,
      guestAccess: values.guestAccess ?? false,
    });

    form.resetFields();
    onCreated(meeting.id);
  };

  return (
    <Modal
      title="New Meeting"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      confirmLoading={createMeeting.isPending}
      okText="Create"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ guestAccess: false }}
      >
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input placeholder="Weekly sync" maxLength={200} />
        </Form.Item>
        <Form.Item name="scheduledAt" label="Scheduled time (optional)">
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="expiresAt"
          label="Expires at (optional)"
          tooltip="Guest links stop working after this time"
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="guestAccess"
          label="Allow external guests"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
