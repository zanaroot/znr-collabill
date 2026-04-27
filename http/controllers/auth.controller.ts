import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import type { AuthEnv } from "@/http/models/auth.model";
import { registerSchema, signInSchema } from "@/http/models/auth.model";
import {
  getUserOrganizations,
  registerOrganizationAndOwner,
} from "@/http/repositories/organization.repository";
import {
  createSession,
  deleteSessionByToken,
} from "@/http/repositories/session.repository";
import { findUserByEmail } from "@/http/repositories/user.repository";
import { getFutureDate } from "@/lib/date";
import { logError } from "@/lib/sentry";
import { generateSessionToken } from "@/lib/session-token";

const factory = createFactory<AuthEnv>();

export const logout = factory.createHandlers(async (c) => {
  const token = getCookie(c, "session_token");

  if (token) {
    await deleteSessionByToken(token);
  }

  deleteCookie(c, "session_token", { path: "/" });

  return c.json({ message: "Logout successful", success: true });
});

export const register = factory.createHandlers(
  zValidator("json", registerSchema),
  async (c) => {
    try {
      const { email, password, name, organizationName } = c.req.valid("json");

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

      setCookie(c, "session_token", sessionToken, {
        httpOnly: true,
        secure: c.req.header("x-forwarded-proto") === "https",
        sameSite: "Lax",
        expires: expiresAt,
        path: "/",
      });

      return c.json({ message: "Registration successful", success: true }, 201);
    } catch (error) {
      logError(error, {
        action: "register",
        email: undefined,
        organizationName: undefined,
      });
      console.error("Registration error:", error);
      return c.json({ error: "Something went wrong", success: false }, 500);
    }
  },
);

export const login = factory.createHandlers(
  zValidator("json", signInSchema),
  async (c) => {
    try {
      const { email, password } = c.req.valid("json");
      const user = await findUserByEmail(email);

      if (!user) {
        return c.json({ error: "User not found", success: false }, 404);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return c.json({ error: "Invalid password", success: false }, 401);
      }

      const userOrgs = await getUserOrganizations(user.id);
      const orgCount = userOrgs.length;
      const primaryOrgId = orgCount === 1 ? userOrgs[0].id : undefined;

      const sessionToken = generateSessionToken();
      const expiresAt = getFutureDate(7);

      await createSession({
        userId: user.id,
        organizationId: primaryOrgId,
        token: sessionToken,
        expiresAt,
      });

      setCookie(c, "session_token", sessionToken, {
        httpOnly: true,
        secure: c.req.header("x-forwarded-proto") === "https",
        sameSite: "Lax",
        expires: expiresAt,
        path: "/",
      });

      return c.json({
        message: "Sign in successful",
        success: true,
        orgCount,
        redirectToOrganization: orgCount === 0,
      });
    } catch (error) {
      logError(error, {
        action: "login",
        email: undefined,
      });
      console.error("Sign in error:", error);
      return c.json({ error: "Something went wrong", success: false }, 500);
    }
  },
);
