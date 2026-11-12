import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { createFactory } from "hono/factory";
import { z } from "zod";
import type { AuthEnv } from "@/http/models/auth.model";
import {
  adminNoteSchema,
  createPlanSchema,
  listOrganizationsQuerySchema,
  updatePlanSchema,
} from "@/http/models/back-office.model";
import { getOrganizationBillingDetail } from "@/http/repositories/back-office.repository";
import {
  BackOfficeError,
  createAdminPlan,
  getBillingDashboard,
  listAdminPlans,
  listOrganizationsForAdmin,
  updateAdminPlan,
} from "@/http/services/back-office.service";
import { getOrganizationUsage } from "@/http/services/entitlement.service";
import {
  adminAddNote,
  listAdminNotes,
} from "@/http/services/subscription-admin.service";

const factory = createFactory<AuthEnv>();

const mapBackOfficeError = (c: Context<AuthEnv>, error: unknown) => {
  if (error instanceof BackOfficeError) {
    return c.json({ error: error.message }, error.statusCode);
  }
  throw error;
};

export const getBackOfficeOverview = factory.createHandlers(async (c) => {
  try {
    return c.json(await getBillingDashboard());
  } catch (error) {
    return mapBackOfficeError(c, error);
  }
});

export const getBackOfficePlans = factory.createHandlers(async (c) => {
  try {
    return c.json(await listAdminPlans());
  } catch (error) {
    return mapBackOfficeError(c, error);
  }
});

export const postBackOfficePlans = factory.createHandlers(
  zValidator("json", createPlanSchema),
  async (c) => {
    const user = c.get("user");
    try {
      const plan = await createAdminPlan(c.req.valid("json"), user.id);
      return c.json(plan, 201);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const patchBackOfficePlans = factory.createHandlers(
  zValidator("param", z.object({ planId: z.uuid() })),
  zValidator("json", updatePlanSchema),
  async (c) => {
    const user = c.get("user");
    const { planId } = c.req.valid("param");
    try {
      const plan = await updateAdminPlan(planId, c.req.valid("json"), user.id);
      return c.json(plan);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const getBackOfficeOrganizations = factory.createHandlers(
  zValidator("query", listOrganizationsQuerySchema),
  async (c) => {
    try {
      return c.json(await listOrganizationsForAdmin(c.req.valid("query")));
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const getBackOfficeOrganization = factory.createHandlers(
  zValidator("param", z.object({ organizationId: z.uuid() })),
  async (c) => {
    const { organizationId } = c.req.valid("param");
    try {
      const detail = await getOrganizationBillingDetail(organizationId);
      if (!detail) {
        return c.json({ error: "Organization not found" }, 404);
      }
      const [notes, usage] = await Promise.all([
        listAdminNotes(organizationId),
        getOrganizationUsage(organizationId),
      ]);
      return c.json({ ...detail, notes, usage });
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);

export const postBackOfficeOrganizationNotes = factory.createHandlers(
  zValidator("param", z.object({ organizationId: z.uuid() })),
  zValidator("json", adminNoteSchema),
  async (c) => {
    const user = c.get("user");
    const { organizationId } = c.req.valid("param");
    const input = c.req.valid("json");
    try {
      const note = await adminAddNote({
        organizationId,
        actorId: user.id,
        subscriptionId: input.subscriptionId ?? null,
        body: input.body,
      });
      return c.json(note, 201);
    } catch (error) {
      return mapBackOfficeError(c, error);
    }
  },
);
