import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import type { ActionResponse } from "@/http/models/auth.model";
import {
  createOrganization,
  deleteOrganizationById,
  getUserOrganizations,
  updateOrganizationSlackSettings,
} from "@/http/repositories/organization.repository";
import { updateSessionOrganization } from "@/http/repositories/session.repository";
import { encryptSlackToken } from "@/packages/slack";
import { wrapActionsWithSentry } from "../utils/wrap-with-sentry/wrap-actions-with-sentry";

export const createOrganizationAction = async (
  name: string,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    const organization = await createOrganization(name, currentUser.id);

    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (token) {
      await updateSessionOrganization(token, organization.id);
    }

    return { message: "Organization created successfully", success: true };
  } catch (error) {
    console.error("Create organization error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const selectOrganizationAction = async (
  organizationId: string,
): Promise<ActionResponse> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;

    if (!token) {
      return { error: "Unauthorized", success: false };
    }

    await updateSessionOrganization(token, organizationId);

    revalidatePath("/");

    return { message: "Organization selected successfully", success: true };
  } catch (error) {
    console.error("Select organization error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const getUserOrganizationsAction = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    return await getUserOrganizations(currentUser.id);
  } catch (error) {
    console.error("Get user organizations error:", error);
    return [];
  }
};

export const updateOrganizationSlackSettingsAction = async (data: {
  slackBotToken?: string | null;
  slackDefaultChannel?: string | null;
}): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.organizationId) {
      return { error: "Unauthorized", success: false };
    }

    if (currentUser.organizationRole !== "OWNER") {
      return { error: "Only owners can update Slack settings", success: false };
    }

    const encryptedToken = data.slackBotToken
      ? encryptSlackToken(data.slackBotToken)
      : null;

    await updateOrganizationSlackSettings(currentUser.organizationId, {
      slackBotTokenEncrypted: encryptedToken,
      slackDefaultChannel: data.slackDefaultChannel,
    });

    return { message: "Slack settings updated successfully", success: true };
  } catch (error) {
    console.error("Update organization Slack settings error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const deleteOrganizationAction = async (
  organizationId: string,
  _confirmDelete: "DELETE",
  hardDelete = false,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    await deleteOrganizationById(organizationId, currentUser.id, hardDelete);

    if (hardDelete) {
      const cookieStore = await cookies();
      const token = cookieStore.get("session_token")?.value;

      if (token) {
        await updateSessionOrganization(token, null);
      }
    }

    revalidatePath("/");

    return {
      message: hardDelete
        ? "Organization permanently deleted"
        : "Organization deleted successfully",
      success: true,
    };
  } catch (error) {
    console.error("Delete organization error:", error);
    return { error: "Something went wrong", success: false };
  }
};
const actions = {
  createOrganizationAction,
  selectOrganizationAction,
  getUserOrganizationsAction,
};

export const organizationActions = wrapActionsWithSentry(
  actions as Record<string, (...args: unknown[]) => Promise<unknown>>,
);
