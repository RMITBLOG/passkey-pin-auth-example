import { loadLocalEnv } from "../src/lib/env";
import { issueSetupPin } from "../src/lib/setup-pin";
import { prisma } from "../src/lib/prisma";
import { getAuthConfig } from "../src/lib/auth-config";

loadLocalEnv();
async function main() {
  if (!process.argv.includes("--app-stopped")) throw new Error("Stop the app first, then pass --app-stopped. This prevents in-flight registrations during revocation.");
  const result = await issueSetupPin(process.argv.includes("--reset"));
  console.log(`Setup: ${new URL("/setup", getAuthConfig().baseURL)}`);
  console.log(`Private one-time PIN: ${result.pin}`);
  console.log(`Expires: ${result.expiresAt.toISOString()}`);
}
main().catch(() => { console.error("PIN issuance failed. Check configuration, owner provisioning, app shutdown and the three-device limit."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
