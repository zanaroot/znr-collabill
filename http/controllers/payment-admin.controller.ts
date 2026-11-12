import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import { listPaymentsQuerySchema } from "@/http/models/back-office.model";
import { BackOfficeError } from "@/http/services/back-office.service";
import {
  getPaymentForAdmin,
  listPaymentsForAdmin,
  refundPaymentAsAdmin,
} from "@/http/services/payment-admin.service";

const factory = createFactory<AuthEnv>();

const paymentParam = z.object({ paymentId: z.uuid() });

const mapBackOfficeError = (c: Context<AuthEnv>, error: unknown) => {
  if (error instanceof BackOfficeError) {
    return c.json({ error: error.message }, error.statusCode);
  }
  throw error;
};

export const getBackOfficePayments = factory.createHandlers(
  zValidator("query", listPaymentsQuerySchema),
  async (c) => {
    try {
      return c.json(await listPaymentsForAdmin(c.req.valid("query")));
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const getBackOfficePayment = factory.createHandlers(
  zValidator("param", paymentParam),
  async (c) => {
    const { paymentId } = c.req.valid("param");
    try {
      return c.json(await getPaymentForAdmin(paymentId));
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postBackOfficePaymentRefund = factory.createHandlers(
  zValidator("param", paymentParam),
  async (c) => {
    const user = c.get("user");
    const { paymentId } = c.req.valid("param");
    try {
      const payment = await refundPaymentAsAdmin({
        paymentId,
        actorId: user.id,
      });
      return c.json(payment);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);
