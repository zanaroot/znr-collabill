"use client";

import { CheckCircleFilled, WarningFilled } from "@ant-design/icons";
import { Button, Flex, Modal, Tooltip, Typography } from "antd";
import { useState } from "react";

type EmailVerificationStatusProps = {
  email: string;
  emailVerified: string | Date | null | undefined;
  onVerify?: () => Promise<void>;
  loading?: boolean;
  showEmail?: boolean;
};

export const EmailVerificationStatus = ({
  email,
  emailVerified,
  onVerify,
  loading = false,
  showEmail = true,
}: EmailVerificationStatusProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const isVerified = Boolean(emailVerified);

  console.log("Email verification status:", {
    email,
    emailVerified,
    isVerified,
  });

  const handleVerify = async () => {
    if (isVerified) return;

    await onVerify?.();
    setModalOpen(false);
  };

  return (
    <>
      <Flex align="center" gap={8}>
        {showEmail && <Typography.Text>{email}</Typography.Text>}

        {isVerified ? (
          <Tooltip title="Email address verified">
            <CheckCircleFilled style={{ color: "#52c41a" }} />
          </Tooltip>
        ) : (
          <Tooltip title="Email address not verified">
            <WarningFilled
              className="cursor-pointer"
              style={{ color: "#faad14" }}
              onClick={(event) => {
                event.stopPropagation();
                setModalOpen(true);
              }}
            />
          </Tooltip>
        )}
      </Flex>

      <Modal
        title="Email verification"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>,
          ...(!isVerified
            ? [
                <Button
                  key="verify"
                  type="primary"
                  loading={loading}
                  onClick={handleVerify}
                >
                  Send verification link
                </Button>,
              ]
            : []),
        ]}
      >
        <Typography.Paragraph>
          The email address <strong>{email}</strong> has not been verified yet.
        </Typography.Paragraph>

        <Typography.Paragraph>
          Send a verification link to confirm this email address.
        </Typography.Paragraph>
      </Modal>
    </>
  );
};
