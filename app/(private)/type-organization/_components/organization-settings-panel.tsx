"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Flex,
  InputNumber,
  message,
  Row,
  Switch,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { client } from "@/packages/hono";
import { queryClient } from "@/packages/react-query";

const { Text } = Typography;

interface OrganizationSettingsPanelProps {
  organizationId: string;
}

export const OrganizationSettingsPanel = ({
  organizationId,
}: OrganizationSettingsPanelProps) => {
  const [presenceSelectionEnabled, setPresenceSelectionEnabled] =
    useState(false);
  const [presenceTypes, setPresenceTypes] = useState({
    OFFICE: {
      enabled: true,
      rate: 100,
    },
    REMOTE: {
      enabled: false,
      rate: 100,
    },
    ON_SITE: {
      enabled: false,
      rate: 120,
    },
    SICK: {
      enabled: true,
      rate: 80,
    },
    VACATION: {
      enabled: true,
      rate: 100,
    },
    ON_LEAVE: {
      enabled: true,
      rate: 0,
    },
  });

  const { data: attendanceSettings } = useQuery({
    queryKey: ["organization-attendance-settings", organizationId],
    queryFn: async () => {
      const response = await client.api.organizations[":organizationId"][
        "attendance-settings"
      ].$get({
        param: {
          organizationId,
        },
      });

      return response.json();
    },
  });

  useEffect(() => {
    if (!attendanceSettings) return;

    setPresenceSelectionEnabled(attendanceSettings.presenceSelectionEnabled);

    const settings = Object.fromEntries(
      attendanceSettings.settings.map((setting) => [
        setting.type,
        {
          enabled: setting.enabled,
          rate: Number(setting.rate),
        },
      ]),
    ) as typeof presenceTypes;

    setPresenceTypes((prev) => ({
      ...prev,
      ...settings,
    }));
    console.log("Merged", settings);
  }, [attendanceSettings]);

  console.log("Initial", presenceTypes);
  console.log("API", attendanceSettings?.settings);

  const mutation = useMutation({
    mutationFn: async () => {
      return client.api.organizations[":organizationId"][
        "attendance-settings"
      ].$put({
        param: {
          organizationId,
        },
        json: {
          presenceSelectionEnabled,
          settings: Object.entries(presenceTypes).map(
            ([type, { enabled, rate }]) => ({
              type: type as
                | "OFFICE"
                | "REMOTE"
                | "ON_SITE"
                | "SICK"
                | "VACATION"
                | "ON_LEAVE",
              enabled,
              rate,
            }),
          ),
        },
      });
    },
    onSuccess: () => {
      message.success("Settings saved");
      queryClient.invalidateQueries({
        queryKey: ["organization-attendance-settings", organizationId],
      });
    },
  });

  return (
    <Flex vertical gap={24}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card
            title="Presence Types"
            extra={
              <Switch
                checked={presenceSelectionEnabled}
                onChange={setPresenceSelectionEnabled}
              />
            }
            style={{ height: "100%" }}
          >
            <Flex vertical gap={20}>
              <div>
                <Text strong>Enable presence selection</Text>
                <br />
                <Text type="secondary">
                  Allow members to choose how they are working when checking in.
                </Text>
              </div>

              <Flex vertical gap={12}>
                <Checkbox
                  disabled={!presenceSelectionEnabled}
                  checked={presenceTypes.OFFICE.enabled}
                  onChange={(e) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      OFFICE: {
                        ...prev.OFFICE,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                >
                  🏢 Office
                </Checkbox>

                <Checkbox
                  disabled={!presenceSelectionEnabled}
                  checked={presenceTypes.REMOTE.enabled}
                  onChange={(e) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      REMOTE: {
                        ...prev.REMOTE,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                >
                  💻 Remote
                </Checkbox>

                <Checkbox
                  disabled={!presenceSelectionEnabled}
                  checked={presenceTypes.ON_SITE.enabled}
                  onChange={(e) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      ON_SITE: {
                        ...prev.ON_SITE,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                >
                  📍 On Site
                </Checkbox>
              </Flex>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Presence Rates" style={{ height: "100%" }}>
            <Text type="secondary">
              Configure the billing rate for worked presences.
            </Text>

            <Flex vertical gap={20} style={{ marginTop: 24 }}>
              <Flex justify="space-between" align="center">
                <Text disabled={!presenceTypes.OFFICE.enabled}>🏢 Office</Text>

                <InputNumber
                  disabled={!presenceTypes.OFFICE.enabled}
                  min={0}
                  max={500}
                  value={presenceTypes.OFFICE.rate}
                  suffix="%"
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text disabled={!presenceTypes.REMOTE.enabled}>💻 Remote</Text>

                <InputNumber
                  disabled={!presenceTypes.REMOTE.enabled}
                  min={0}
                  max={500}
                  value={presenceTypes.REMOTE.rate}
                  suffix="%"
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text disabled={!presenceTypes.ON_SITE.enabled}>
                  📍 On Site
                </Text>

                <InputNumber
                  disabled={!presenceTypes.ON_SITE.enabled}
                  min={0}
                  max={500}
                  value={presenceTypes.ON_SITE.rate}
                  suffix="%"
                />
              </Flex>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Absence Rates" style={{ height: "100%" }}>
            <Text type="secondary">
              Configure the billing rate for absences.
            </Text>

            <Flex vertical gap={20} style={{ marginTop: 24 }}>
              <Flex justify="space-between" align="center">
                <Text>🤒 Sick Leave</Text>
                <InputNumber
                  min={0}
                  max={500}
                  value={presenceTypes.SICK.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      SICK: {
                        ...prev.SICK,
                        rate: value ?? 0,
                      },
                    }))
                  }
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text>🌴 Vacation</Text>
                <InputNumber
                  min={0}
                  max={500}
                  value={presenceTypes.VACATION.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      VACATION: {
                        ...prev.VACATION,
                        rate: value ?? 0,
                      },
                    }))
                  }
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text>📄 Other Leave</Text>
                <InputNumber
                  min={0}
                  max={500}
                  value={presenceTypes.ON_LEAVE.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      ON_LEAVE: {
                        ...prev.ON_LEAVE,
                        rate: value ?? 0,
                      },
                    }))
                  }
                />
              </Flex>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Flex justify="end">
        <Button type="primary" onClick={() => mutation.mutate()}>
          Save Settings
        </Button>
      </Flex>
    </Flex>
  );
};
