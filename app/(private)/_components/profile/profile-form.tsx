
import { Button, Form, type FormInstance, Input } from "antd";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

type ProfileFormValues = {
  name: string;
  email: string;
  phoneNumber?: string;
  phoneOwnerName?: string;
};

type ProfileFormProps = {
  form: FormInstance<ProfileFormValues>;
  onFinish: (values: ProfileFormValues) => void;
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
        rules={[
          {
            required: true,
            message: "Please enter your name",
          },
        ]}
      >
        <Input placeholder="Enter your name" />
      </Form.Item>

      <Form.Item name="phoneNumber" label="Phone Number">
        <PhoneInput
          defaultCountry="mg"
          preferredCountries={["mg", "fr", "us", "ca"]}
          style={{ width: "100%" }}
          inputStyle={{
            width: "100%",
            height: 32,
            fontSize: 14,
          }}
          countrySelectorStyleProps={{
            buttonStyle: {
              height: 32,
            },
          }}
        />
      </Form.Item>

      <Form.Item
        name="phoneOwnerName"
        label="Phone Owner Name"
      >
        <Input placeholder="Enter the phone owner's name" />
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
