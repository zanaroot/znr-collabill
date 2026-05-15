"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { App, Button, Drawer, Flex, Form, Input, InputNumber } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  type CreateProjectInput,
  createProjectSchema,
} from "@/http/models/project.model";
import { useCreateProject } from "../_hooks/use-projects";

const { TextArea } = Input;

interface CreateProjectDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDrawer({
  open,
  onClose,
}: CreateProjectDrawerProps) {
  const { message } = App.useApp();
  const createProjectMutation = useCreateProject();
  const [form] = Form.useForm();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      gitRepo: "",
      baseRate: 1,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: CreateProjectInput) => {
    createProjectMutation.mutate(data, {
      onSuccess: () => {
        message.success("Project created successfully");
        handleClose();
      },
      onError: (error) => {
        message.error(error.message || "Failed to create project");
      },
    });
  };

  return (
    <Drawer
      title="Create Project"
      placement="right"
      size={500}
      onClose={handleClose}
      open={open}
      destroyOnHidden
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="primary"
            onClick={handleSubmit(onSubmit)}
            loading={createProjectMutation.isPending}
          >
            Create
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Project Name"
          required
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Enter project name" />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Description"
          validateStatus={errors.description ? "error" : ""}
          help={errors.description?.message}
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                rows={3}
                placeholder="Enter project description"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Git Repository URL"
          validateStatus={errors.gitRepo ? "error" : ""}
          help={errors.gitRepo?.message}
        >
          <Controller
            name="gitRepo"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="https://github.com/user/repo" />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Base Rate"
          validateStatus={errors.baseRate ? "error" : ""}
          help={errors.baseRate?.message}
        >
          <Controller
            name="baseRate"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={0}
                step={0.01}
                placeholder="Enter base rate"
                style={{ width: "100%" }}
              />
            )}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
