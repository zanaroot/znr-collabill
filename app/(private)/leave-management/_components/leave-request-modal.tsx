"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  message,
  Row,
  Select,
  Statistic,
} from "antd";
import type { Dayjs } from "dayjs";
import type { LeaveBalance } from "@/http/models/leave.model";
import { client } from "@/packages/hono";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface LeaveRequestFormValues {
  dates: [Dayjs, Dayjs];
  type: "FULL_DAY" | "HALF_DAY_AM" | "HALF_DAY_PM";
  reason?: string;
}

interface LeaveRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export const LeaveRequestModal = ({
  open,
  onClose,
}: LeaveRequestModalProps) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: balance } = useQuery({
    queryKey: ["my-leave-balance"],
    queryFn: async () => {
      const res = await client.api["leave-requests"].balance.$get();
      const data = await res.json();
      if ("error" in data) return null;
      return data as LeaveBalance;
    },
    enabled: open,
  });

  const { mutateAsync: createRequest, isPending } = useMutation({
    mutationFn: async (values: LeaveRequestFormValues) => {
      const payload = {
        startDate: values.dates[0].format("YYYY-MM-DD"),
        endDate: values.dates[1].format("YYYY-MM-DD"),
        type: values.type,
        reason: values.reason,
      };

      const res = await client.api["leave-requests"].$post({
        json: payload,
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || "Failed to create leave request");
      }

      return res.json();
    },
    onSuccess: () => {
      message.success("Leave request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      form.resetFields();
      onClose();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  const onFinish = (values: LeaveRequestFormValues) => {
    createRequest(values);
  };

  return (
    <Modal
      title="Request Leave"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Statistic
            title="Balance"
            value={balance && !("error" in balance) ? balance.balance : 0}
            precision={1}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Used"
            value={balance && !("error" in balance) ? balance.used : 0}
            precision={1}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Remaining"
            value={balance && !("error" in balance) ? balance.remaining : 0}
            precision={1}
            styles={{ content: { color: "#3f8600" } }}
          />
        </Col>
      </Row>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="dates"
          label="Date Range"
          rules={[{ required: true, message: "Please select dates" }]}
        >
          <RangePicker style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="type"
          label="Leave Type"
          initialValue="FULL_DAY"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="FULL_DAY">Full Day</Select.Option>
            <Select.Option value="HALF_DAY_AM">Half Day (AM)</Select.Option>
            <Select.Option value="HALF_DAY_PM">Half Day (PM)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="reason" label="Reason">
          <TextArea rows={4} placeholder="Optional reason for your leave" />
        </Form.Item>

        <Form.Item className="mb-0 text-right">
          <Button onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            Submit Request
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
