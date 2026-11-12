import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  adminCancelSchema,
  adminChangePlanSchema,
  adminExtendSchema,
} from "@/http/models/back-office.model";
import { BackOfficeError } from "@/http/services/back-office.service";
import {
  adminActivateSubscription,
  adminCancelSubscription,
  adminChangeSubscriptionPlan,
  adminExtendSubscription,
  adminReactivateSubscription,
  adminSuspendSubscription,
} from "@/http/services/subscription-admin.service";

const factory = createFactory<AuthEnv>();

const subscriptionParam = z.object({ subscriptionId: z.uuid() });

const mapBackOfficeError = (c: Context<AuthEnv>, error: unknown) => {
  if (error instanceof BackOfficeError) {
    return c.json({ error: error.message }, error.statusCode);
  }
  throw error;
};

export const postActivateSubscription = factory.createHandlers(
  zValidator("param", subscriptionParam),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminActivateSubscription({
        subscriptionId,
        actorId: user.id,
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postSuspendSubscription = factory.createHandlers(
  zValidator("param", subscriptionParam),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminSuspendSubscription({
        subscriptionId,
        actorId: user.id,
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postReactivateSubscription = factory.createHandlers(
  zValidator("param", subscriptionParam),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminReactivateSubscription({
        subscriptionId,
        actorId: user.id,
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postExtendSubscription = factory.createHandlers(
  zValidator("param", subscriptionParam),
  zValidator("json", adminExtendSchema),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminExtendSubscription({
        subscriptionId,
        actorId: user.id,
        ...c.req.valid("json"),
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postCancelSubscription = factory.createHandlers(
  zValidator("param", subscriptionParam),
  zValidator("json", adminCancelSchema),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminCancelSubscription({
        subscriptionId,
        actorId: user.id,
        ...c.req.valid("json"),
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postChangeSubscriptionPlan = factory.createHandlers(
  zValidator("param", subscriptionParam),
  zValidator("json", adminChangePlanSchema),
  async (c) => {
    const user = c.get("user");
    const { subscriptionId } = c.req.valid("param");
    try {
      const subscription = await adminChangeSubscriptionPlan({
        subscriptionId,
        actorId: user.id,
        ...c.req.valid("json"),
      });
      return c.json(subscription);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);
