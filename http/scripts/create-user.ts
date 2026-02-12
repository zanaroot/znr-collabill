import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import { db } from "../../db";
import { userRoles, users } from "../../db/schema";

async function main() {
  // Create a readline interface that reads from stdin
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: stdin.isTTY, // Use terminal mode only for interactive shells
  });

  const lines: string[] = [];
  let inputCount = 0;
  const requiredInputs = 4;

  return new Promise<void>((resolve) => {
    rl.on("line", (line) => {
      lines.push(line.trim());
      inputCount++;
      if (inputCount >= requiredInputs) {
        rl.close();
      }
    });

    rl.on("close", async () => {
      try {
        const email = lines[0] || "";
        const name = lines[1] || "";
        const password = lines[2] || "";
        const roleInput = lines[3] || "";
        const role = (roleInput || "COLLABORATOR").toUpperCase();

        // For piped input, output what we're doing
        if (!stdin.isTTY) {
          console.log(`Creating user with:`);
          console.log(`  Email: ${email}`);
          console.log(`  Name: ${name}`);
          console.log(`  Role: ${role}`);
        }

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
      } catch (error) {
        console.error(
          "Error creating user:",
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });

    rl.on("error", (err) => {
      console.error("Error:", err);
      process.exit(1);
    });

    // If interactive, prompt for input
    if (stdin.isTTY) {
      rl.question("Email: ", (email) => {
        rl.question("Name: ", (name) => {
          stdout.write("Password: ");
          stdin.setRawMode(true);

          let password = "";
          const passwordHandler = (char: Buffer) => {
            const ch = char.toString();

            if (ch === "\n" || ch === "\r") {
              stdin.removeListener("data", passwordHandler);
              stdin.setRawMode(false);
              stdout.write("\n");

              rl.question(
                "Role (OWNER | COLLABORATOR) [COLLABORATOR]: ",
                (role) => {
                  lines[0] = email;
                  lines[1] = name;
                  lines[2] = password;
                  lines[3] = role;
                  rl.close();
                }
              );
            } else if (ch === "\u0003") {
              stdin.removeListener("data", passwordHandler);
              process.exit();
            } else if (ch === "\u007f") {
              password = password.slice(0, -1);
            } else if (ch !== "\u001b") {
              password += ch;
            }
          };

          stdin.on("data", passwordHandler);
        });
      });
    }
  });
}

main();
