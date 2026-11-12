"use client";

import { ExclamationCircleOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useChangePlan, useCheckout } from "@/app/_hooks/use-billing";
import type { PlanInput, SubscriptionInput } from "@/app/_utils/billing";
import {
  formatPlanPrice,
  getPlanAction,
  planSupportsInterval,
} from "@/app/_utils/billing";
import type { SubscriptionInterval } from "@/http/models/subscription.model";

type PlanCtaButtonProps = {
  plan: PlanInput;
  subscription: SubscriptionInput | null | undefined;
  isOwner: boolean;
  size?: "small" | "middle";
  block?: boolean;
  interval?: SubscriptionInterval;
};

export const PlanCtaButton = ({
  plan,
  subscription,
  isOwner,
  size = "middle",
  block,
  interval,
}: PlanCtaButtonProps) => {
  const { modal } = App.useApp();
  const checkout = useCheckout();
  const changePlan = useChangePlan();

  if (!isOwner) {
    return null;
  }

  const effectiveInterval =
    interval && planSupportsInterval(plan, interval) ? interval : plan.interval;
  const action = getPlanAction(plan, subscription, effectiveInterval);
  const busy = checkout.isPending || changePlan.isPending;

  if (action === "loading") {
    return (
      <Button loading disabled size={size} block={block}>
        Choose plan
      </Button>
    );
  }

  if (action === "current") {
    return (
      <Button disabled size={size} block={block}>
        Current plan
      </Button>
    );
  }

  const label = action === "checkout" ? "Choose plan" : "Switch plan";
  const price = formatPlanPrice(plan, effectiveInterval);

  const handleConfirm = () => {
    if (action === "checkout" && effectiveInterval) {
      checkout
        .mutateAsync({ planCode: plan.code, interval: effectiveInterval })
        .catch(() => undefined);
      return;
    }
    changePlan
      .mutateAsync({
        planCode: plan.code,
        interval: effectiveInterval ?? undefined,
      })
      .catch(() => undefined);
  };

  const openConfirm = () => {
    modal.confirm({
      title:
        action === "checkout"
          ? `Subscribe to ${plan.name}?`
          : `Switch to ${plan.name}?`,
      icon: <ExclamationCircleOutlined />,
      content:
        action === "checkout"
          ? `${price}. You will be redirected to checkout to complete the payment.`
          : `${price}. Your organization will be moved to this plan immediately.`,
      okText: action === "checkout" ? "Continue to checkout" : "Switch plan",
      cancelText: "Cancel",
      onOk: handleConfirm,
    });
  };

  return (
    <Button
      type="primary"
      size={size}
      block={block}
      loading={busy}
      onClick={openConfirm}
    >
      {label}
    </Button>
  );
};
