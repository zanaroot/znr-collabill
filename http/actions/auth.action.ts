"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAudit } from "@/http/actions/audit.action";
import type {
  ActionResponse,
  RegisterInput,
  SignInInput,
} from "@/http/models/auth.model";
import { registerSchema, signInSchema } from "@/http/models/auth.model";
import {
  getUserOrganizations,
  registerOrganizationAndOwner,
} from "@/http/repositories/organization.repository";
import {
  createSession,
  deleteSessionByToken,
  findValidSessionByToken,
} from "@/http/repositories/session.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { getFutureDate } from "@/lib/date";
import { generateSessionToken } from "@/lib/session-token";
// import { serverEnv } from "@/packages/env/server";
import { wrapActionsWithSentry } from "../utils/wrap-with-sentry/wrap-actions-with-sentry";

const shouldUseSecureCookie = async () => {
  const hdrs = await headers();
  const forwardedProto = hdrs.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const host = hdrs.get("host") ?? "";
  const isLocalhost =
    host.includes("localhost") || host.startsWith("127.0.0.1") || host === "";
  if (isLocalhost) {
    return false;
  }

  return process.env.NODE_ENV === "production";
};

export const registerAction = async (
  input: RegisterInput,
): Promise<ActionResponse> => {
  try {
    const parsed = registerSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { email, password, name, organizationName } = parsed.data;

    const existingUser = await findUserByEmail(email);

    let passwordHash: string | undefined;
    if (!existingUser) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { user, organization } = await registerOrganizationAndOwner({
      email,
      name,
      passwordHash,
      organizationName,
    });

    const sessionToken = generateSessionToken();
    const expiresAt = getFutureDate(7);

    await createSession({
      userId: user.id,
      organizationId: organization.id,
      token: sessionToken,
      expiresAt,
    });

    await logAudit({
      organizationId: organization.id,
      actorId: user.id,
      action: "CREATE",
      entity: "ORGANIZATION",
      entityId: organization.id,
      metadata: { name: organization.name },
    });

    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: await shouldUseSecureCookie(),
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    revalidatePath("/");

    return { message: "Registration successful", success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const signInAction = async (
  input: SignInInput,
): Promise<
  ActionResponse & { redirectToOrganization?: boolean; orgCount?: number }
> => {
  try {
    const parsed = signInSchema.safeParse(input);

    if (!parsed.success) {
      return { error: "Invalid data", success: false };
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return { error: "User not found", success: false };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Invalid password", success: false };
    }

    const userOrgs = await getUserOrganizations(user.id);
    const orgCount = userOrgs.length;
    const primaryOrgId = orgCount === 1 ? userOrgs[0].id : undefined;

    const sessionToken = generateSessionToken();
    const expiresAt = getFutureDate(7);

    // If more than one org, we create a session without organizationId first,
    // or we'll let the selection page update it.
    await createSession({
      userId: user.id,
      organizationId: primaryOrgId,
      token: sessionToken,
      expiresAt,
    });

    if (primaryOrgId) {
      await logAudit({
        organizationId: primaryOrgId,
        actorId: user.id,
        action: "LOGIN",
        entity: "SESSION",
        metadata: { email: user.email },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set("session_token", sessionToken, {
      httpOnly: true,
      secure: await shouldUseSecureCookie(),
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    revalidatePath("/");

    if (orgCount === 0) {
      return {
        message: "Sign in successful",
        success: true,
        redirectToOrganization: true,
        orgCount: 0,
      };
    }

    return {
      message: "Sign in successful",
      success: true,
      orgCount,
    };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Something went wrong", success: false };
  }
};

export const logoutAction = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    const result = await findValidSessionByToken(token);
    if (result?.session?.organizationId) {
      await logAudit({
        organizationId: result.session.organizationId,
        actorId: result.session.userId,
        action: "LOGOUT",
        entity: "SESSION",
      });
    }
    await deleteSessionByToken(token);
  }

  cookieStore.delete("session_token");
  redirect("/");
};

const actions = {
  registerAction,
  signInAction,
  logoutAction,
};

export const authActions = wrapActionsWithSentry(
  actions as Record<string, (...args: unknown[]) => Promise<unknown>>,
);
