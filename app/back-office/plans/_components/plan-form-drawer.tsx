"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Drawer,
  Input,
  InputNumber,
  Form as RForm,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import type { CreatePlanInput } from "@/http/models/back-office.model";
import { createPlanSchema } from "@/http/models/back-office.model";
import type { AdminPlan } from "../../_hooks/use-back-office";
import { useCreatePlan, useUpdatePlan } from "../../_hooks/use-back-office";

const { Text } = Typography;

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP"].map((code) => ({
  label: code,
  value: code,
}));

const FEATURE_OPTIONS = [
  { label: "Integrations", value: "integrations" },
  { label: "Finance", value: "finance" },
];

const defaultValues: CreatePlanInput = {
  code: "",
  name: "",
  description: "",
  amountMinor: 0,
  amountMinorYearly: null,
  currency: "USD",
  supportedCurrencies: ["USD"],
  maxMembers: null,
  maxProjects: null,
  features: [],
  active: true,
};

const planToValues = (plan: AdminPlan): CreatePlanInput => ({
  code: plan.code,
  name: plan.name,
  description: plan.description ?? "",
  amountMinor: plan.amountMinor,
  amountMinorYearly: plan.amountMinorYearly ?? null,
  currency: plan.currency,
  supportedCurrencies:
    plan.supportedCurrencies && plan.supportedCurrencies.length > 0
      ? plan.supportedCurrencies
      : [plan.currency],
  maxMembers: plan.maxMembers,
  maxProjects: plan.maxProjects,
  features: (plan.features ?? []) as ("integrations" | "finance")[],
  active: plan.active ?? true,
});

export const PlanFormDrawer = ({
  open,
  plan,
  onClose,
}: {
  open: boolean;
  plan: AdminPlan | null;
  onClose: () => void;
}) => {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isEdit = plan !== null;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(plan ? planToValues(plan) : defaultValues);
    }
  }, [open, plan, reset]);

  const amountMinor = watch("amountMinor");
  const amountMinorYearly = watch("amountMinorYearly");
  const maxMembers = watch("maxMembers");
  const maxProjects = watch("maxProjects");
  const active = watch("active");
  const supportedCurrencies = watch("supportedCurrencies");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (plan) {
        await updatePlan.mutateAsync({ planId: plan.id, values });
      } else {
        await createPlan.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  });

  const yearlyIntervalHint =
    (amountMinor ?? 0) === 0 && (amountMinorYearly ?? 0) > 0
      ? "This plan will be sold as yearly only."
      : (amountMinor ?? 0) > 0 && (amountMinorYearly ?? 0) > 0
        ? "Monthly and yearly billing are both available."
        : (amountMinor ?? 0) > 0
          ? "This plan will be sold as monthly only."
          : "Add a price to make the plan purchasable.";

  return (
    <Drawer
      title={isEdit ? `Edit ${plan?.code}` : "Create plan"}
      open={open}
      onClose={onClose}
      width={520}
      extra={
        <Button
          type="primary"
          form="plan-form"
          htmlType="submit"
          loading={createPlan.isPending || updatePlan.isPending}
        >
          Save
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        message={yearlyIntervalHint}
        style={{ marginBottom: 16 }}
      />
      <RForm layout="vertical" id="plan-form" onFinish={onSubmit}>
        {isEdit && (
          <Controller
            name="code"
            control={control}
            render={({ field }) => <input type="hidden" {...field} />}
          />
        )}
        {!isEdit && (
          <RForm.Item
            label="Code"
            validateStatus={errors.code ? "error" : ""}
            help={errors.code?.message}
          >
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="GOLD" autoComplete="off" />
              )}
            />
          </RForm.Item>
        )}
        <RForm.Item
          label="Name"
          validateStatus={errors.name ? "error" : ""}
          help={errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => <Input {...field} placeholder="Gold" />}
          />
        </RForm.Item>
        <RForm.Item
          label="Description"
          validateStatus={errors.description ? "error" : ""}
          help={errors.description?.message}
        >
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="Optional"
              />
            )}
          />
        </RForm.Item>
        <Space size={16} align="start">
          <RForm.Item
            label="Monthly price"
            validateStatus={errors.amountMinor ? "error" : ""}
            help={errors.amountMinor?.message as string | undefined}
          >
            <InputNumber
              min={0}
              step={1}
              prefix={watch("currency")}
              value={(amountMinor ?? 0) / 100}
              onChange={(value) =>
                setValue("amountMinor", Math.round((value ?? 0) * 100), {
                  shouldValidate: true,
                })
              }
              style={{ width: 180 }}
            />
          </RForm.Item>
          <RForm.Item
            label="Yearly price"
            validateStatus={errors.amountMinorYearly ? "error" : ""}
            help={
              (errors.amountMinorYearly?.message as string | undefined) ??
              "Leave empty for no yearly billing"
            }
          >
            <InputNumber
              min={0}
              step={1}
              prefix={watch("currency")}
              value={amountMinorYearly ? amountMinorYearly / 100 : null}
              onChange={(value) =>
                setValue(
                  "amountMinorYearly",
                  value && value > 0 ? Math.round(value * 100) : null,
                  { shouldValidate: true },
                )
              }
              style={{ width: 180 }}
            />
          </RForm.Item>
        </Space>
        <Space size={16} align="start">
          <RForm.Item
            label="Currency"
            validateStatus={errors.currency ? "error" : ""}
            help={errors.currency?.message}
          >
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select {...field} options={CURRENCY_OPTIONS} />
              )}
            />
          </RForm.Item>
          <RForm.Item
            label="Supported currencies"
            validateStatus={errors.supportedCurrencies ? "error" : ""}
            help={errors.supportedCurrencies?.message as string | undefined}
          >
            <Select
              mode="multiple"
              options={CURRENCY_OPTIONS}
              value={supportedCurrencies ?? []}
              onChange={(value) =>
                setValue("supportedCurrencies", value, {
                  shouldValidate: true,
                })
              }
              placeholder="Must include currency"
              style={{ minWidth: 220 }}
            />
          </RForm.Item>
        </Space>
        <Space size={16} align="start">
          <RForm.Item
            label="Max members (0 = unlimited)"
            validateStatus={errors.maxMembers ? "error" : ""}
            help={errors.maxMembers?.message as string | undefined}
          >
            <InputNumber
              min={0}
              step={1}
              value={maxMembers ?? 0}
              onChange={(value) =>
                setValue("maxMembers", value && value > 0 ? value : null, {
                  shouldValidate: true,
                })
              }
              style={{ width: 200 }}
            />
          </RForm.Item>
          <RForm.Item
            label="Max projects (0 = unlimited)"
            validateStatus={errors.maxProjects ? "error" : ""}
            help={errors.maxProjects?.message as string | undefined}
          >
            <InputNumber
              min={0}
              step={1}
              value={maxProjects ?? 0}
              onChange={(value) =>
                setValue("maxProjects", value && value > 0 ? value : null, {
                  shouldValidate: true,
                })
              }
              style={{ width: 200 }}
            />
          </RForm.Item>
        </Space>
        <RForm.Item
          label="Features"
          validateStatus={errors.features ? "error" : ""}
          help={errors.features?.message as string | undefined}
        >
          <Select
            mode="multiple"
            options={FEATURE_OPTIONS}
            value={watch("features") ?? []}
            onChange={(value) =>
              setValue("features", value, { shouldValidate: true })
            }
            placeholder="No features"
          />
        </RForm.Item>
        <RForm.Item
          label="Active"
          extra={
            <Text type="secondary">
              Inactive plans are hidden from checkout and plan changes.
            </Text>
          }
        >
          <Switch
            checked={active ?? true}
            onChange={(checked) =>
              setValue("active", checked, { shouldValidate: true })
            }
          />
        </RForm.Item>
      </RForm>
    </Drawer>
  );
};
