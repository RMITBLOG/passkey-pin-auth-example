import { loadLocalEnv } from "../src/lib/env";
loadLocalEnv();

async function main() {
  const { ensureOwnerUser } = await import("../src/lib/tokens");
  const { prisma } = await import("../src/lib/prisma");
  try {
    await ensureOwnerUser();
    console.log("Internal passkey principal ready. Stop the app before issuing a setup PIN.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Could not initialize the local database."); process.exitCode = 1; });
