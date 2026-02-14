import { dbClient } from "./index";
import { seedCore } from "./seeds/core.seed";

seedCore()
  .then((result) => {
    console.log("Core seed complete.");
    console.log(`Owner: ${result.owner.email}`);
    console.log(`Collaborator: ${result.collaborator.email}`);
    console.log(`Password: ${result.password}`);
  })
  .catch((error) => {
    console.error("Core seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await dbClient.end();
  });
