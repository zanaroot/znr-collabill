"use client";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from "@ant-design/icons";

import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Project } from "@/http/models/project.model";
import type { UserWithRoles } from "@/http/models/user.model";

const { Text, Title } = Typography;

interface RateSettingsFormProps {
  isOwner: boolean;

  users: UserWithRoles[];

  selectedUser?: UserWithRoles;

  selectedUserId: string;

  setSelectedUserId: (id: string) => void;

  rates: {
    rateXs: string;
    rateS: string;
    rateM: string;
    rateL: string;
    rateXl: string;
    dailyRate: string;
  };

  setRates: React.Dispatch<
    React.SetStateAction<{
      rateXs: string;
      rateS: string;
      rateM: string;
      rateL: string;
      rateXl: string;
      dailyRate: string;
    }>
  >;

  presenceTypes: {
    OFFICE: { enabled: boolean; rate: number };
    REMOTE: { enabled: boolean; rate: number };
    HALF_DAY: { enabled: boolean; rate: number };
    SICK: { enabled: boolean; rate: number };
    VACATION: { enabled: boolean; rate: number };
    ON_LEAVE: { enabled: boolean; rate: number };
  };

  setPresenceTypes: React.Dispatch<
    React.SetStateAction<{
      OFFICE: { enabled: boolean; rate: number };
      REMOTE: { enabled: boolean; rate: number };
      HALF_DAY: { enabled: boolean; rate: number };
      SICK: { enabled: boolean; rate: number };
      VACATION: { enabled: boolean; rate: number };
      ON_LEAVE: { enabled: boolean; rate: number };
    }>
  >;

  projects: Project[];

  projectRateColumns: ColumnsType<Project>;

  leaveSettings: {
    unusedLeavePolicy: string;
    adminLeaveQuota: number;
    collaboratorLeaveQuota: number;
  };

  setLeaveSettings: React.Dispatch<
    React.SetStateAction<{
      unusedLeavePolicy: string;
      adminLeaveQuota: number;
      collaboratorLeaveQuota: number;
    }>
  >;

  onSaveAll: () => void;
  isSaving: boolean;
}

export default function RateSettingsForm({
  isOwner,
  users,
  selectedUserId,
  setSelectedUserId,
  rates,
  setRates,
  presenceTypes,
  setPresenceTypes,
  leaveSettings,
  setLeaveSettings,
  projects,
  projectRateColumns,
  onSaveAll,
  isSaving,
}: RateSettingsFormProps) {
  const handleBaseRateMChange = (value: string) => {
    const m = Number(value);

    if (value === "") {
      setRates((prev) => ({
        ...prev,
        rateM: "",
        rateXs: "",
        rateS: "",
        rateL: "",
        rateXl: "",
      }));

      return;
    }

    if (Number.isNaN(m)) return;

    setRates((prev) => ({
      ...prev,
      rateXs: (m / 4).toString(),
      rateS: (m / 2).toString(),
      rateM: value,
      rateL: (m * 2).toString(),
      rateXl: (m * 4).toString(),
    }));
  };

  return (
    <div style={{ width: "99%" }}>
      <Flex vertical gap={4} style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Rate Settings
        </Title>

        <Text type="secondary">
          Configure billing rates, attendance rates and leave policies for your
          organization.
        </Text>
      </Flex>

      <Card
        title={
          <Space>
            <DollarOutlined />

            <span>
              {isOwner
                ? `Rates for ${
                    selectedUserId
                      ? users.find((user) => user.id === selectedUserId)?.name
                      : "Member"
                  }`
                : "My Rates"}
            </span>
          </Space>
        }
        style={{
          marginBottom: 20,
          width: "100%",
        }}
        extra={
          isOwner && (
            <Select
              showSearch
              value={selectedUserId || undefined}
              placeholder="Select a member"
              optionFilterProp="label"
              onChange={setSelectedUserId}
              style={{ width: 300 }}
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
              }))}
            />
          )
        }
      >
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>XS</Text>

              <Input suffix="€" value={rates.rateXs} readOnly />
            </Flex>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>S</Text>

              <Input suffix="€" value={rates.rateS} readOnly />
            </Flex>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>M (Base)</Text>

              <Input
                suffix="€"
                value={rates.rateM}
                readOnly={!isOwner}
                onChange={
                  isOwner
                    ? (e) => handleBaseRateMChange(e.target.value)
                    : undefined
                }
              />
            </Flex>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>L</Text>

              <Input suffix="€" value={rates.rateL} readOnly />
            </Flex>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>XL</Text>

              <Input suffix="€" value={rates.rateXl} readOnly />
            </Flex>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Flex vertical gap={6}>
              <Text strong>Daily</Text>

              <Input
                suffix="€"
                value={rates.dailyRate}
                readOnly={!isOwner}
                onChange={
                  isOwner
                    ? (e) =>
                        setRates((prev) => ({
                          ...prev,
                          dailyRate: e.target.value,
                        }))
                    : undefined
                }
              />
            </Flex>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card
            title={
              <Space>
                <DollarOutlined />

                <span>Project Billing Rates</span>
              </Space>
            }
          >
            <Text type="secondary">
              Configure billing and reviewer rates for each project.
            </Text>
            <Table
              style={{ marginTop: 24 }}
              rowKey="id"
              dataSource={projects}
              columns={projectRateColumns}
              pagination={false}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />

                <span>Presence Rates</span>
              </Space>
            }
            style={{
              height: "100%",
            }}
          >
            <Text type="secondary">
              Configure the billing rate for worked presences.
            </Text>

            <Flex
              vertical
              gap={18}
              style={{
                marginTop: 24,
              }}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <span>🏢</span>

                  <Text disabled={!presenceTypes.OFFICE.enabled}>Office</Text>
                </Flex>

                <InputNumber
                  disabled={!presenceTypes.OFFICE.enabled}
                  min={0}
                  max={500}
                  readOnly={!isOwner}
                  value={presenceTypes.OFFICE.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      OFFICE: {
                        ...prev.OFFICE,
                        rate: value ?? 0,
                      },
                    }))
                  }
                  style={{
                    width: 90,
                  }}
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <span>💻</span>

                  <Text disabled={!presenceTypes.REMOTE.enabled}>Remote</Text>
                </Flex>

                <InputNumber
                  disabled={!presenceTypes.REMOTE.enabled}
                  min={0}
                  max={500}
                  readOnly={!isOwner}
                  value={presenceTypes.REMOTE.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      REMOTE: {
                        ...prev.REMOTE,
                        rate: value ?? 0,
                      },
                    }))
                  }
                  style={{
                    width: 90,
                  }}
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <span>🕐</span>

                  <Text disabled={!presenceTypes.HALF_DAY.enabled}>
                    Half Day
                  </Text>
                </Flex>

                <InputNumber
                  disabled={!presenceTypes.HALF_DAY.enabled}
                  min={0}
                  max={500}
                  readOnly={!isOwner}
                  value={presenceTypes.HALF_DAY.rate}
                  suffix="%"
                  onChange={(value) =>
                    setPresenceTypes((prev) => ({
                      ...prev,
                      HALF_DAY: {
                        ...prev.HALF_DAY,
                        rate: value ?? 0,
                      },
                    }))
                  }
                  style={{
                    width: 90,
                  }}
                />
              </Flex>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CloseCircleOutlined />

                <span>Absence Rates</span>
              </Space>
            }
            style={{
              height: "100%",
            }}
          >
            <Text type="secondary">
              Configure the billing rate for absences.
            </Text>

            <Flex
              vertical
              gap={18}
              style={{
                marginTop: 24,
              }}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <span>🤒</span>
                  <Text>Sick Leave</Text>
                </Flex>

                <InputNumber
                  min={0}
                  max={500}
                  readOnly={!isOwner}
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
                <Flex align="center" gap={8}>
                  <span>🌴</span>

                  <Text>Vacation</Text>
                </Flex>

                <InputNumber
                  min={0}
                  max={500}
                  readOnly={!isOwner}
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
                <Flex align="center" gap={8}>
                  <span>📄</span>

                  <Text>Other Leave</Text>
                </Flex>

                <InputNumber
                  min={0}
                  max={500}
                  readOnly={!isOwner}
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

        <Col xs={24}>
          <Card
            title={
              <Space>
                <CalendarOutlined />

                <span>Leave Settings</span>
              </Space>
            }
          >
            <Text type="secondary">
              Configure leave quotas and unused leave policy.
            </Text>

            <Form layout="vertical" style={{ marginTop: 24 }}>
              <Form.Item label="Unused Leave Policy">
                <Radio.Group
                  disabled={!isOwner}
                  value={leaveSettings.unusedLeavePolicy}
                  onChange={(e) =>
                    setLeaveSettings((prev) => ({
                      ...prev,
                      unusedLeavePolicy: e.target.value,
                    }))
                  }
                >
                  <Flex vertical gap={10}>
                    <Radio value="CARRY_OVER">Carry Over (to next month)</Radio>

                    <Radio value="PAID_AS_WORKED">
                      Paid as Worked (add to invoice)
                    </Radio>
                  </Flex>
                </Radio.Group>
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Admin Leave Quota">
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.5}
                      suffix="%"
                      disabled={!isOwner}
                      value={leaveSettings.adminLeaveQuota}
                      onChange={(value) =>
                        setLeaveSettings((prev) => ({
                          ...prev,
                          adminLeaveQuota: value ?? 0,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Collaborator Leave Quota">
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.5}
                      suffix="%"
                      disabled={!isOwner}
                      value={leaveSettings.collaboratorLeaveQuota}
                      onChange={(value) =>
                        setLeaveSettings((prev) => ({
                          ...prev,
                          collaboratorLeaveQuota: value ?? 0,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
      {isOwner && (
        <Flex
          justify="flex-end"
          align="center"
          style={{
            position: "fixed",
            bottom: 10,
            left: 0,
            right: 80,
            zIndex: 1000,
            padding: "16px 24px",
            boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Button
            type="primary"
            size="large"
            loading={isSaving}
            onClick={onSaveAll}
          >
            Save All Rates
          </Button>
        </Flex>
      )}
    </div>
  );
}
