import { createHmac } from "node:crypto";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passkey } from "@better-auth/passkey";
import { prisma } from "./prisma";
import { getAuthConfig } from "./auth-config";
import { resolveSetupToken } from "./tokens";
import { authorizePasskeyRegistration } from "./passkey-policy";

const { baseURL, rpID } = getAuthConfig();
const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret || authSecret.length < 32 || authSecret.includes("replace-with-")) {
  throw new Error("Set BETTER_AUTH_SECRET to a unique random value of at least 32 characters.");
}
let lastCleanup = 0;
const rateLimitPaths = new Set([
  "/passkey/generate-authenticate-options",
  "/passkey/verify-authentication",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  "/get-session",
  "/sign-out",
]);

export const auth = betterAuth({
  appName: "Passkey + PIN example",
  secret: authSecret,
  baseURL,
  trustedOrigins: [baseURL],
  disabledPaths: ["/passkey/delete-passkey"],
  // Neither client-ip nor x-forwarded-for is trustworthy in a standalone example.
  advanced: { ipAddress: { ipAddressHeaders: [] } },
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  databaseHooks: { session: { create: { before: async (session) => session.userId === "owner" } } },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/passkey/generate-authenticate-options": { window: 60, max: 10 },
      "/passkey/generate-register-options": { window: 60, max: 10 },
    },
    customStorage: {
      consume: async (key, rule) => {
        const secret = process.env.BETTER_AUTH_SECRET;
        if (!secret || secret.length < 32) throw new Error("A strong BETTER_AUTH_SECRET is required.");
        // Better Auth's key includes the request path. Unknown paths can be
        // attacker-chosen, so collapse them into one bounded storage bucket.
        const separator = key.indexOf("|");
        const path = separator < 0 ? "" : key.slice(separator + 1);
        // Different route rules must not reset each other's time windows.
        const bucket = `${rateLimitPaths.has(path) ? path : "other"}:${rule.window}:${rule.max}`;
        const id = `auth:${createHmac("sha256", secret).update(bucket).digest("hex")}`;
        const now = new Date();
        if (now.getTime() - lastCleanup > 60 * 60_000) {
          lastCleanup = now.getTime();
          await Promise.all([
            prisma.setupRateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 60 * 60_000) } } }),
            prisma.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
          ]);
        }
        return prisma.$transaction(async (tx) => {
          await tx.setupRateLimit.updateMany({
            where: { id, windowStart: { lte: new Date(now.getTime() - rule.window * 1000) } },
            data: { windowStart: now, attempts: 0 },
          });
          const counter = await tx.setupRateLimit.upsert({
            where: { id }, create: { id, windowStart: now, attempts: 1 }, update: { attempts: { increment: 1 } },
          });
          return {
            allowed: counter.attempts <= rule.max,
            retryAfter: Math.max(1, Math.ceil((counter.windowStart.getTime() + rule.window * 1000 - now.getTime()) / 1000)),
          };
        });
      },
    },
  },
  plugins: [
    passkey({
      rpID,
      rpName: "Passkey + PIN example",
      origin: baseURL,
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      registration: {
        requireSession: false,
        resolveUser: async ({ context }) => {
          const resolved = await resolveSetupToken(context ?? "");
          if (!resolved) throw new Error("Setup authorization is invalid or expired.");
          return { id: resolved.user.id, name: "Owner", displayName: "Owner" };
        },
        afterVerification: async ({ context, user, verification }) => {
          await authorizePasskeyRegistration(context, user.id, verification.registrationInfo?.userVerified === true);
        },
      },
      authentication: {
        afterVerification: async ({ verification }) => {
          if (!verification.authenticationInfo.userVerified) throw new Error("Device verification is required.");
        },
      },
    }),
    nextCookies(),
  ],
});
