import { Button, Form, type FormInstance, Input } from "antd";

type ProfileFormProps = {
  form: FormInstance<{ name: string; email: string }>;
  onFinish: (values: { name: string; email: string }) => void;
  isPending: boolean;
  isUploading: boolean;
  onCancel: () => void;
};

export const ProfileForm = ({
  form,
  onFinish,
  isPending,
  isUploading,
  onCancel,
}: ProfileFormProps) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      className="w-full mt-4"
    >
      <Form.Item
        name="name"
        label="Full Name"
        rules={[{ required: true, message: "Please enter your name" }]}
      >
        <Input placeholder="Enter your name" />
      </Form.Item>
      <div className="flex gap-2 mt-2 w-full">
        <Button block onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={isPending || isUploading}
        >
          Save
        </Button>
      </div>
    </Form>
  );
};
