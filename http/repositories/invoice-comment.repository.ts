"server only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoiceComments, invoices, users } from "@/db/schema";

export interface CreateCommentInput {
  invoiceId: string;
  userId: string;
  content: string;
}

export const findCommentsByInvoiceId = async (invoiceId: string) => {
  return await db
    .select({
      id: invoiceComments.id,
      content: invoiceComments.content,
      createdAt: invoiceComments.createdAt,
      updatedAt: invoiceComments.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(invoiceComments)
    .innerJoin(users, eq(invoiceComments.userId, users.id))
    .where(eq(invoiceComments.invoiceId, invoiceId))
    .orderBy(desc(invoiceComments.createdAt));
};

export const createComment = async (input: CreateCommentInput) => {
  const [comment] = await db
    .insert(invoiceComments)
    .values({
      invoiceId: input.invoiceId,
      userId: input.userId,
      content: input.content,
    })
    .returning();

  return comment;
};

export const findInvoiceWithOrganization = async (invoiceId: string) => {
  const [invoice] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      organizationId: invoices.organizationId,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  return invoice ?? null;
};

export const findOrganizationMembersToNotify = async (
  invoiceId: string,
  excludeUserId: string,
  organizationId: string,
) => {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(
      invoices,
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, organizationId),
      ),
    )
    .where(and(eq(invoices.userId, users.id), eq(users.id, excludeUserId)));
};
