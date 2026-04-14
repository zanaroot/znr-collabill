import { Button, Card, Form, Switch, Tooltip } from "antd";
import type { IntegrationType } from "@/http/models/integration.model";

export type Integration = {
  id: string;
  organizationId: string;
  type: IntegrationType;
  isActive: string;
  hasCredentials: boolean;
};

export type IntegrationFormValues = {
  token?: string;
  apiKey?: string;
  mailFrom?: string;
  botToken?: string;
  defaultChannel?: string;
};

const getImpactMessage = (type?: IntegrationType) => {
  switch (type) {
    case "SLACK":
      return "Deactivating Slack will stop all notifications and alerts to your workspace channels.";
    case "GITHUB":
      return "Deactivating GitHub will stop repository automation and issue synchronization.";
    case "BREVO":
      return "Deactivating Brevo will stop all automated email deliveries (e.g., invoice sending).";
    default:
      return "Deactivating this integration will stop all related automated processes.";
  }
};

export const IntegrationCard = ({
  integration,
  loading,
  onSave,
  onToggle,
  renderForm,
}: {
  integration?: Integration;
  loading: boolean;
  onSave: (values: IntegrationFormValues) => void;
  onToggle: (isActive: boolean) => void;
  renderForm: (
    form: ReturnType<typeof Form.useForm>[0],
    disabled: boolean,
  ) => React.ReactNode;
}) => {
  const [form] = Form.useForm();

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <Tooltip
          title={
            integration?.isActive === "true"
              ? getImpactMessage(integration?.type)
              : !integration?.hasCredentials
                ? "Please configure credentials to activate"
                : "Activate this integration"
          }
        >
          <Switch
            checked={integration?.isActive === "true"}
            onChange={onToggle}
            disabled={!integration?.hasCredentials}
          />
        </Tooltip>
        <span style={{ marginLeft: 8 }}>Active</span>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onSave}
        initialValues={{
          token: "",
          apiKey: "",
          mailFrom: "",
          botToken: "",
          defaultChannel: "",
        }}
      >
        {renderForm(form, false)}

        <Form.Item>
          <span style={{ marginRight: 8 }}>
            Status:{" "}
            {integration?.hasCredentials ? "Configured" : "Not configured"}
          </span>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};
