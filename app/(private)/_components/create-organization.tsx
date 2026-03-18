"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, message } from "antd";
import { useState } from "react";
import { createOrganizationAction } from "@/http/actions/organization.action";

type CreateOrganizationProps = {
  onSuccess?: () => void;
};

export const CreateOrganization = ({ onSuccess }: CreateOrganizationProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name) return;

    const response = await createOrganizationAction(name);

    if (response.success) {
      message.success(response.message);
      setOpen(false);
      setName("");
      onSuccess?.();
    } else {
      message.error(response.error);
    }
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
      >
        <Input
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Modal>
    </>
  );
};
