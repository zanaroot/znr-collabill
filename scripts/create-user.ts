import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import { createInterface } from "node:readline/promises";
import { db } from "../db";
import { userRoles, users } from "../db/schema";

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout,
      terminal: true,
    });

    stdout.write(question);
    stdin.setRawMode(true);

    let value = "";

    stdin.on("data", (char) => {
      const ch = char.toString();

      if (ch === "\n" || ch === "\r") {
        stdin.setRawMode(false);
        stdout.write("\n");
        rl.close();
        resolve(value.trim());
      } else if (ch === "\u0003") {
        process.exit();
      } else if (ch === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    });
  });
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const email = (await rl.question("Email: ")).trim();
  const name = (await rl.question("Name: ")).trim();
  const password = await askHidden("Password: ");
  const roleInput = (
    await rl.question("Role (OWNER | COLLABORATOR) [COLLABORATOR]: ")
  ).trim();

  rl.close();

  const role = (roleInput || "COLLABORATOR").toUpperCase();

  if (!email || !name || !password) {
    console.error("Email, name and password are required.");
    process.exit(1);
  }

  if (!["OWNER", "COLLABORATOR"].includes(role)) {
    console.error("Invalid role. Must be OWNER or COLLABORATOR");
    process.exit(1);
  }

  console.log(`\nCreating user ${email} with role ${role}...\n`);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    console.error("User with this email already exists.");
    process.exit(1);
  }

  const passwordHash = await hash(password, 10);

  await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning({ id: users.id });

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    await tx.insert(userRoles).values({
      userId: newUser.id,
      role: role as "OWNER" | "COLLABORATOR",
    });

    console.log(`✅ User created successfully! ID: ${newUser.id}`);
  });

  process.exit(0);
}

main();
