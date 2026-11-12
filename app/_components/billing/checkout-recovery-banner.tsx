"use client";

import { Alert, Button, Space } from "antd";
import { useCheckoutRecovery } from "@/app/_hooks/use-billing";
import { getPaymentStatusMeta } from "@/app/_utils/billing";

export const CheckoutRecoveryBanner = () => {
  const recovery = useCheckoutRecovery();
  const { pending, payment, isError, isChecking, attemptsExhausted, dismiss } =
    recovery;

  if (!pending) {
    return null;
  }

  const actions = (
    <Space>
      <Button size="small" loading={isChecking} onClick={recovery.checkNow}>
        Check now
      </Button>
      <Button size="small" type="text" onClick={dismiss}>
        Dismiss
      </Button>
    </Space>
  );

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message="Could not verify your checkout"
        description="Check your payment history to see the latest status."
        action={actions}
      />
    );
  }

  if (!payment) {
    return (
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Checking your checkout…"
        action={actions}
      />
    );
  }

  const meta = getPaymentStatusMeta(payment.status);
  const planLabel = pending.planCode ? ` for ${pending.planCode}` : "";

  if (payment.status === "SUCCEEDED") {
    return (
      <Alert
        type="success"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Payment confirmed${planLabel} — your subscription is active`}
        action={actions}
      />
    );
  }

  if (payment.status === "FAILED") {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Checkout failed${planLabel}`}
        description={
          payment.failureReason ?? "The payment could not be processed."
        }
        action={actions}
      />
    );
  }

  if (payment.status === "REFUNDED") {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Payment refunded${planLabel}`}
        description={payment.failureReason ?? "The charge was refunded."}
        action={actions}
      />
    );
  }

  if (attemptsExhausted) {
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={`Checkout still pending${planLabel}`}
        description={`Status: ${meta.label}. It may take a moment to settle — check again or review payment history.`}
        action={actions}
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message={`Waiting for checkout to complete${planLabel}`}
      description="You will be able to see the payment status here."
      action={actions}
    />
  );
};
