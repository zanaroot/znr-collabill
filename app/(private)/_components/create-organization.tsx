"use client";

import { PlusOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Modal, message } from "antd";
import { useState } from "react";
import { client } from "@/packages/hono";

type CreateOrgResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

type CreateOrganizationProps = {
  onSuccess?: () => void;
};

export const CreateOrganization = ({ onSuccess }: CreateOrganizationProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const { mutateAsync: createOrg, isPending: loading } = useMutation({
    mutationFn: async (orgName: string) => {
      const res = await client.api.organizations.$post({
        json: { name: orgName },
      });
      const result = await res.json();
      if (!res.ok) {
        const errorData = result as CreateOrgResponse;
        throw new Error(errorData.error || "Error creating the organization.");
      }
      return result;
    },
    onSuccess: (data) => {
      const responseData = data as CreateOrgResponse;
      if (responseData.success) {
        message.success(
          responseData.message || "Organization created successfully!",
        );
        setOpen(false);
        setName("");
        onSuccess?.();
      } else {
        message.error(responseData.error || "Error creating the organization.");
      }
    },
    onError: (error: Error) => {
      console.error(error);
      message.error(error.message || "Error creating the organization.");
    },
  });

  const handleCreate = async () => {
    if (!name) return;
    await createOrg(name);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        <PlusOutlined />
        Create Organization
      </Button>
      <Modal
        title="create organization"
        open={open}
        onCancel={handleCancel}
        onOk={handleCreate}
        confirmLoading={loading}
      >
        <Input
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </Modal>
    </>
  );
};
