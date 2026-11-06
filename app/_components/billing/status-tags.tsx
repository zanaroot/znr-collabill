"use client";

import { Tag } from "antd";
import {
  getPaymentStatusMeta,
  getSubscriptionStatusMeta,
} from "@/app/_utils/billing";
import type {
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from "@/http/models/subscription.model";

export const SubscriptionStatusTag = ({
  status,
}: {
  status: SubscriptionStatus;
}) => {
  const meta = getSubscriptionStatusMeta(status);
  return <Tag color={meta.color}>{meta.label}</Tag>;
};

export const PaymentStatusTag = ({
  status,
}: {
  status: SubscriptionPaymentStatus;
}) => {
  const meta = getPaymentStatusMeta(status);
  return <Tag color={meta.color}>{meta.label}</Tag>;
};
