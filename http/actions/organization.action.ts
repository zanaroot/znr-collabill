"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/http/actions/get-current-user.action";
import type { ActionResponse } from "@/http/models/auth.model";
import {
  createOrganization,
  getUserOrganizations,
} from "@/http/repositories/organization.repository";
import { updateSessionOrganization } from "@/http/repositories/session.repository";

export const createOrganizationAction = async (
  name: string,
): Promise<ActionResponse> => {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { error: "Unauthorized", success: false };
    }

    // if (currentUser.organizationId) {
    //   return { error: "You already belong to an organization", success: false };
    // }

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

// export const deleteOrganizationAction = async (
//   organizationId: string,
// ): Promise<ActionResponse> => {
//   try {
//     const currentUser = await getCurrentUser();
//     if (!currentUser) {
//       return { error: "Unauthorized", success: false };
//     }

//     const cookieStore = await cookies();
//     const token = cookieStore.get("session_token")?.value;

//     await deleteOrganizationById(organizationId);

//     if (token) {
//       const remainingOrganizations = await getUserOrganizations(currentUser.id);

//       if (remainingOrganizations.length > 0) {
//         await updateSessionOrganization(token, remainingOrganizations[0].id);
//       } else {
//         await updateSessionOrganization(token, null);
//       }
//     }

//     revalidatePath("/organizations");

//     return { success: true, message: "Organization deleted" };
//   } catch (error) {
//     console.error(error);
//     return { error: "Something went wrong", success: false };
//   }
// };
