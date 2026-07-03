import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { uploadFile } from "../../packages/minio";
import { db } from "../index";
import {
  collaboratorRates,
  leaveBalances,
  organizationIntegrations,
  organizationMembers,
  organizations,
  projectMembers,
  projects,
  tasks,
  userRoles,
  users,
} from "../schema";

type SeedUserInput = {
  email: string;
  name: string;
  role: "OWNER" | "COLLABORATOR" | "ADMIN";
};

const seedOwnerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@collabill.local";
const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@collabill.local";
const seedCollaboratorEmail =
  process.env.SEED_COLLABORATOR_EMAIL ?? "collab@collabill.local";
const seedPassword = process.env.SEED_PASSWORD ?? "password123";

export type CoreSeedResult = {
  collaborator: typeof users.$inferSelect;
  owner: typeof users.$inferSelect;
  admin: typeof users.$inferSelect;
  password: string;
  project: typeof projects.$inferSelect;
  organization: typeof organizations.$inferSelect;
};

const seedUsers: SeedUserInput[] = [
  {
    email: seedOwnerEmail,
    name: "Seed Owner",
    role: "OWNER",
  },
  {
    email: seedAdminEmail,
    name: "Seed Admin",
    role: "ADMIN",
  },
  {
    email: seedCollaboratorEmail,
    name: "Seed Collaborator",
    role: "COLLABORATOR",
  },
];

async function getOrCreateUser(input: SeedUserInput, passwordHash: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
    })
    .returning();

  if (!created) {
    throw new Error(`Failed to create user ${input.email}`);
  }

  return created;
}

async function getOrCreateOrganization(
  ownerId: string,
  adminId: string,
  collaboratorId: string,
) {
  const slug = "seed-organization";
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(organizations)
    .values({
      name: "Seed Organization",
      slug,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create seed organization.");
  }

  await db.insert(organizationMembers).values([
    {
      organizationId: created.id,
      userId: ownerId,
      role: "OWNER",
    },
    {
      organizationId: created.id,
      userId: collaboratorId,
      role: "COLLABORATOR",
    },
    {
      organizationId: created.id,
      userId: adminId,
      role: "ADMIN",
    },
  ]);

  return created;
}

async function seedRolesAndRates(core: {
  admin: typeof users.$inferSelect;
  adminRole: SeedUserInput["role"];
  collaborator: typeof users.$inferSelect;
  collaboratorRole: SeedUserInput["role"];
  owner: typeof users.$inferSelect;
  ownerRole: SeedUserInput["role"];
  organizationId: string;
}) {
  await db
    .insert(userRoles)
    .values([
      {
        userId: core.owner.id,
        role: core.ownerRole,
        organizationId: core.organizationId,
      },
      {
        userId: core.collaborator.id,
        role: core.collaboratorRole,
        organizationId: core.organizationId,
      },
      {
        userId: core.admin.id,
        role: core.adminRole,
        organizationId: core.organizationId,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(collaboratorRates)
    .values({
      userId: core.collaborator.id,
      organizationId: core.organizationId,
      dailyRate: "400",
      rateXs: "100",
      rateS: "200",
      rateM: "400",
      rateL: "800",
      rateXl: "1600",
    })
    .onConflictDoUpdate({
      target: [collaboratorRates.userId, collaboratorRates.organizationId],
      set: {
        dailyRate: "400",
        rateXs: "100",
        rateS: "200",
        rateM: "400",
        rateL: "800",
        rateXl: "1600",
      },
    });
}

async function seedLeaveBalances(
  collaboratorId: string,
  organizationId: string,
) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const existing = await db.query.leaveBalances.findFirst({
    where: and(
      eq(leaveBalances.userId, collaboratorId),
      eq(leaveBalances.organizationId, organizationId),
      eq(leaveBalances.month, month),
      eq(leaveBalances.year, year),
    ),
  });

  if (existing) {
    return;
  }

  await db.insert(leaveBalances).values([
    {
      userId: collaboratorId,
      organizationId,
      month,
      year,
      balance: "2.0",
      used: "0.0",
      remaining: "2.0",
    },
    {
      userId: collaboratorId,
      organizationId,
      month: month === 1 ? 12 : month - 1,
      year: month === 1 ? year - 1 : year,
      balance: "2.0",
      used: "0.5",
      remaining: "1.5",
    },
  ]);
}

async function seedOrganizationIntegration(organizationId: string) {
  const existing = await db.query.organizationIntegrations.findFirst({
    where: eq(organizationIntegrations.organizationId, organizationId),
  });

  if (existing) {
    return;
  }

  await db.insert(organizationIntegrations).values({
    organizationId,
    type: "GITHUB",
    credentialsEncrypted: "seed-encrypted-github-token",
    config: JSON.stringify({
      repos: ["example/collabill-seed", "example/collabill-seed-v2"],
    }),
  });
}

async function getOrCreateSeedProject(ownerId: string, organizationId: string) {
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.name, "Seed Project"),
      eq(projects.createdBy, ownerId),
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(projects)
    .values({
      name: "Seed Project",
      description: "Demo workspace generated by db/seeds/core.seed.ts",
      gitRepo: "https://github.com/example/collabill-seed",
      baseRate: "400",
      reviewerRate: "0",
      slackChannel: "#seed-project",
      slackNotificationsEnabled: false,
      createdAt: new Date(),
      createdBy: ownerId,
      organizationId,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create seed project.");
  }

  return created;
}

async function getOrCreateSecondProject(
  ownerId: string,
  collaboratorId: string,
  adminId: string,
  organizationId: string,
) {
  const existing = await db.query.projects.findFirst({
    where: and(
      eq(projects.name, "Seed Project v2"),
      eq(projects.createdBy, ownerId),
    ),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(projects)
    .values({
      name: "Seed Project v2",
      description: "Second project for testing multiple projects",
      gitRepo: "https://github.com/example/collabill-seed-v2",
      baseRate: "0.5",
      reviewerRate: "0.25",
      slackChannel: "#seed-project-v2",
      slackNotificationsEnabled: true,
      createdAt: new Date(),
      createdBy: ownerId,
      organizationId,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create second seed project.");
  }

  await db.insert(projectMembers).values([
    { projectId: created.id, userId: ownerId, role: "PRODUCT_OWNER" },
    { projectId: created.id, userId: collaboratorId, role: "MEMBER" },
    { projectId: created.id, userId: adminId, role: "MEMBER" },
  ]);

  await db.insert(tasks).values([
    {
      projectId: created.id,
      title: "Project kickoff meeting",
      description: "Schedule and run kickoff meeting with stakeholders.",
      size: "XS",
      priority: 1,
      status: "VALIDATED",
      assignedTo: ownerId,
      dueDate: "2026-01-20",
      reviewerId: adminId,
      gitRepo: "https://github.com/example/collabill-seed-v2",
      createdAt: new Date("2026-01-15"),
      validatedAt: new Date("2026-01-20"),
      validatedBy: adminId,
    },
    {
      projectId: created.id,
      title: "Design system setup",
      description: "Configure design tokens and component library.",
      size: "M",
      priority: 2,
      status: "IN_PROGRESS",
      assignedTo: collaboratorId,
      dueDate: "2026-02-15",
      reviewerId: adminId,
      gitRepo: "https://github.com/example/collabill-seed-v2",
      createdAt: new Date("2026-01-20"),
      gitBranch: "feature/design-system",
      gitPullRequest: "https://github.com/example/collabill-seed-v2/pull/1",
      previewLink: "https://preview.collabill.dev/design-system",
    },
    {
      projectId: created.id,
      title: "API integration",
      description: "Integrate with external API services.",
      size: "L",
      priority: 3,
      status: "TODO",
      assignedTo: collaboratorId,
      dueDate: "2026-03-01",
      gitRepo: "https://github.com/example/collabill-seed-v2",
      createdAt: new Date("2026-02-01"),
      gitBranch: "develop",
    },
  ]);

  return created;
}

async function seedProjectMembershipAndTasks(input: {
  collaboratorId: string;
  ownerId: string;
  adminId: string;
  projectId: string;
}) {
  await db
    .insert(projectMembers)
    .values([
      {
        projectId: input.projectId,
        userId: input.ownerId,
        role: "PRODUCT_OWNER",
      },
      {
        projectId: input.projectId,
        userId: input.collaboratorId,
        role: "MEMBER",
      },
      {
        projectId: input.projectId,
        userId: input.adminId,
        role: "MEMBER",
      },
    ])
    .onConflictDoNothing();

  const existingTasksCount = await db.$count(
    tasks,
    eq(tasks.projectId, input.projectId),
  );

  if (existingTasksCount > 0) {
    return;
  }

  await db.insert(tasks).values([
    {
      projectId: input.projectId,
      title: "Set up project backlog",
      description: "Create initial backlog and milestones.",
      size: "S",
      priority: 1,
      status: "TODO",
      assignedTo: input.ownerId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      gitRepo: "https://github.com/example/collabill-seed",
      createdAt: new Date(),
      gitBranch: "main",
    },
    {
      projectId: input.projectId,
      title: "Implement first feature",
      description: "Build and validate the first seed feature.",
      size: "M",
      priority: 2,
      status: "IN_PROGRESS",
      assignedTo: input.collaboratorId,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      reviewerId: input.adminId,
      gitRepo: "https://github.com/example/collabill-seed",
      createdAt: new Date(),
      gitBranch: "feature/first-feature",
      gitPullRequest: "https://github.com/example/collabill-seed/pull/1",
    },
    {
      projectId: input.projectId,
      title: "Validate completed feature",
      description: "Review and validate the completed feature work.",
      size: "M",
      priority: 3,
      status: "VALIDATED",
      assignedTo: input.adminId,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      reviewerId: input.adminId,
      gitRepo: "https://github.com/example/collabill-seed",
      createdAt: new Date(),
      validatedAt: new Date(),
      validatedBy: input.adminId,
      gitBranch: "main",
      gitPullRequest: "https://github.com/example/collabill-seed/pull/1",
    },
  ]);
}

async function uploadSeedAvatar(userId: string) {
  try {
    const avatarPath = join(process.cwd(), "public", "fake-avatar.png");
    const buffer = readFileSync(avatarPath);

    const fileName = "seed-avatar.png";
    const key = `avatars/${userId}/${Date.now()}-${fileName}`;
    const url = await uploadFile(buffer, key, "image/png");

    await db.update(users).set({ avatar: url }).where(eq(users.id, userId));
    return url;
  } catch (error) {
    console.error(`Failed to upload seed avatar for user ${userId}:`, error);
    return null;
  }
}

export const seedCore = async (): Promise<CoreSeedResult> => {
  const [ownerInput, adminInput, collaboratorInput] = seedUsers;

  if (!ownerInput || !collaboratorInput || !adminInput) {
    throw new Error("Seed users are not configured correctly.");
  }

  const passwordHash = await hash(seedPassword, 10);

  const owner = await getOrCreateUser(ownerInput, passwordHash);
  const collaborator = await getOrCreateUser(collaboratorInput, passwordHash);
  const admin = await getOrCreateUser(adminInput, passwordHash);

  await uploadSeedAvatar(owner.id);
  await uploadSeedAvatar(collaborator.id);
  await uploadSeedAvatar(admin.id);
  const organization = await getOrCreateOrganization(
    owner.id,
    admin.id,
    collaborator.id,
  );

  await seedRolesAndRates({
    admin,
    adminRole: adminInput.role,
    collaborator,
    collaboratorRole: collaboratorInput.role,
    owner,
    ownerRole: ownerInput.role,
    organizationId: organization.id,
  });

  await seedLeaveBalances(collaborator.id, organization.id);
  await seedOrganizationIntegration(organization.id);

  const project = await getOrCreateSeedProject(owner.id, organization.id);

  await getOrCreateSecondProject(
    owner.id,
    collaborator.id,
    admin.id,
    organization.id,
  );

  await seedProjectMembershipAndTasks({
    collaboratorId: collaborator.id,
    ownerId: owner.id,
    adminId: admin.id,
    projectId: project.id,
  });

  return {
    collaborator,
    owner,
    admin,
    password: seedPassword,
    project,
    organization,
  };
};
