"use client";

import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Flex,
  Input,
  Segmented,
  Space,
  Typography,
} from "antd";
import { useState } from "react";
import { TASK_STATUSES, type TaskStatus } from "@/lib/task-status";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
};

type CreateBoardProps = {
  tasks: Task[];
};

export function CreateBoard({ tasks }: CreateBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {TASK_STATUSES.map((status) => (
        <Column
          key={status}
          status={status}
          tasks={tasks.filter((task) => task.status === status)}
        />
      ))}
    </div>
  );
}

type ColumnProps = {
  status: TaskStatus;
  tasks: Task[];
};

function Column({ status, tasks }: ColumnProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>("Map");

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Col span={6}>
      <Card
        title={formatStatus(status)}
        extra={
          <Flex>
            <PlusOutlined onClick={() => setOpen(true)} />
            <Drawer
              title="Edit task details"
              placement="right"
              open={open}
              onClose={() => setOpen(false)}
              size="large"
              extra={
                <Space>
                  <Button onClick={onClose}>Cancel</Button>
                  <Button type="primary" onClick={onClose}>
                    SAVE
                  </Button>
                </Space>
              }
            >
              <Flex vertical gap={10}>
                <Flex vertical gap={3}>
                  <Typography>Task Title</Typography>
                  <Input width={300} />
                </Flex>
                <Flex gap={16}>
                  <Flex vertical gap={3}>
                    <Typography>Assegne</Typography>
                    <Input style={{ width: 335 }} />
                  </Flex>
                  <Flex vertical gap={3}>
                    <Typography>Due date</Typography>
                    <DatePicker style={{ width: 335 }} />
                  </Flex>
                </Flex>
                <Flex gap={17}>
                  <Flex vertical gap={3}>
                    <Typography>Priority</Typography>
                    <Segmented
                      options={["Easy", "Medium", "Hard"]}
                      value={value}
                      onChange={setValue}
                      style={{ width: 335 }}
                      block
                    />
                  </Flex>
                  <Flex vertical gap={3}>
                    <Typography>Sise</Typography>
                    <Segmented
                      options={["xs", "sm", "md", "lg", "xl"]}
                      value={value}
                      onChange={setValue}
                      style={{ width: 335 }}
                      block
                    />
                  </Flex>
                </Flex>
                <Flex gap={16} style={{ marginTop: "15px" }}>
                  <Flex vertical gap={3}>
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          {
                            key: 1,
                            label: <Typography>JardiReport</Typography>,
                          },
                          { key: 2, label: <Typography>Revly</Typography> },
                          { key: 3, label: <Typography>Expo</Typography> },
                        ],
                      }}
                    >
                      <Button
                        style={{ width: 336, justifyContent: "space-between" }}
                      >
                        <Typography>Projet</Typography>
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  </Flex>
                  <Flex vertical gap={3}>
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          {
                            key: 1,
                            label: <Typography>JardiReport</Typography>,
                          },
                          { key: 2, label: <Typography>Revly</Typography> },
                          { key: 3, label: <Typography>Expo</Typography> },
                        ],
                      }}
                    >
                      <Button
                        style={{ width: 336, justifyContent: "space-between" }}
                      >
                        <Typography>Type Branche</Typography>
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  </Flex>
                </Flex>
                <Flex vertical gap={3} style={{ marginTop: "15px" }}>
                  <Typography>Description</Typography>
                  <Card style={{ minHeight: 200, width: 690 }}></Card>
                </Flex>
              </Flex>
            </Drawer>
          </Flex>
        }
        style={{ minHeight: 700, width: 380 }}
      >
        {tasks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map((task) => (
              <Card
                key={task.id}
                size="small"
                type="inner"
                style={{ borderRadius: 6 }}
              >
                {task.title}
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="Aucune tâche" />
        )}
      </Card>
    </Col>
  );
}

function formatStatus(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
      return "In progress";
    case "IN_REVIEW":
      return "In review";
    case "VALIDATED":
      return "Validated";
  }
}
