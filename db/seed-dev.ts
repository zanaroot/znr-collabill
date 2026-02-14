import { dbClient } from "./index";
import { seedDev } from "./seeds/dev.seed";

seedDev()
  .then((result) => {
    console.log("Dev seed complete.");
    console.log(`Owner: ${result.owner.email}`);
    console.log(`Collaborator: ${result.collaborator.email}`);
    console.log(`Password: ${result.password}`);
  })
  .catch((error) => {
    console.error("Dev seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await dbClient.end();
  });
