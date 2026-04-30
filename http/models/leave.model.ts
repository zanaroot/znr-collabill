import { z } from "zod";

export const leaveRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const leaveTypeSchema = z.enum([
  "FULL_DAY",
  "HALF_DAY_AM",
  "HALF_DAY_PM",
]);
export const unusedLeavePolicySchema = z.enum(["CARRY_OVER", "PAID_AS_WORKED"]);

export const leaveRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  type: leaveTypeSchema.default("FULL_DAY"),
  status: leaveRequestStatusSchema.default("PENDING"),
  reason: z.string().optional().nullable(),
  approvedBy: z.string().uuid().optional().nullable(),
  approvedAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const createLeaveRequestSchema = leaveRequestSchema
  .omit({
    id: true,
    userId: true,
    organizationId: true,
    status: true,
    approvedBy: true,
    approvedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .refine(
    (data) => {
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    },
  );

export const updateLeaveRequestStatusSchema = z.object({
  status: leaveRequestStatusSchema,
});

export const leaveBalanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  balance: z.string(),
  used: z.string(),
  remaining: z.string(),
});

export const organizationLeaveSettingsSchema = z.object({
  unusedLeavePolicy: unusedLeavePolicySchema,
  adminLeaveQuota: z.string(),
  collaboratorLeaveQuota: z.string(),
});

export type LeaveRequest = z.infer<typeof leaveRequestSchema>;
export type CreateLeaveRequest = z.infer<typeof createLeaveRequestSchema>;
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;
export type OrganizationLeaveSettings = z.infer<
  typeof organizationLeaveSettingsSchema
>;
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveRequestStatus = z.infer<typeof leaveRequestStatusSchema>;
