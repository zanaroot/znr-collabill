import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, resetToken.userId));

    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
