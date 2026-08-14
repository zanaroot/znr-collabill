import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  organizationAttendanceSettings,
  organizations,
} from "@/db/schema/organization";

export async function getOrganizationAttendanceSettings(
  organizationId: string,
) {
  return db
    .select()
    .from(organizationAttendanceSettings)
    .where(eq(organizationAttendanceSettings.organizationId, organizationId));
}

export async function getOrganizationPresenceSelectionSetting(
  organizationId: string,
) {
  return db.query.organizations.findFirst({
    columns: {
      presenceSelectionEnabled: true,
    },
    where: eq(organizations.id, organizationId),
  });
}

export async function upsertOrganizationAttendanceSettings(
  organizationId: string,
  presenceSelectionEnabled: boolean,
  settings: {
    type: "OFFICE" | "REMOTE" | "ON_SITE" | "SICK" | "VACATION" | "ON_LEAVE";
    enabled: boolean;
    rate: number;
  }[],
) {
  return db.transaction(async () => {
    // 1. Sauvegarder l'état du switch
    await db
      .update(organizations)
      .set({
        presenceSelectionEnabled,
      })
      .where(eq(organizations.id, organizationId));

    // 2. Sauvegarder les types de présence
    for (const setting of settings) {
      await db
        .insert(organizationAttendanceSettings)
        .values({
          organizationId,
          type: setting.type,
          enabled: setting.enabled,
          rate: String(setting.rate),
        })
        .onConflictDoUpdate({
          target: [
            organizationAttendanceSettings.organizationId,
            organizationAttendanceSettings.type,
          ],
          set: {
            enabled: setting.enabled,
            rate: String(setting.rate),
          },
        });
    }
  });
}
