import { createHash } from "node:crypto";
import { prisma } from "./prisma";

const OWNER_ID = "owner";
export function hashSetupToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function getOwnerUser() {
  return prisma.user.findUnique({ where: { id: OWNER_ID } });
}
export async function resolveSetupToken(token: string) {
  if (!token) return null;
  const row = await prisma.setupToken.findUnique({ where: { tokenHash: hashSetupToken(token) } });
  if (!row || !row.pinVerified || row.usedAt || row.expiresAt.getTime() <= Date.now()) return null;
  const user = await getOwnerUser();
  return user ? { token: row, user } : null;
}
export async function consumeSetupToken(token: string) {
  if (!token) return null;
  const user = await getOwnerUser();
  if (!user) return null;
  const consumed = await prisma.setupToken.updateMany({
    where: { tokenHash: hashSetupToken(token), pinVerified: true, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return consumed.count === 1 ? user : null;
}
export function ensureOwnerUser() {
  const now = new Date();
  // Better Auth stores a single internal principal to associate up to three passkeys.
  // This is not a user signup or an email login identity.
  return prisma.user.upsert({
    where: { id: OWNER_ID },
    update: {},
    create: { id: OWNER_ID, email: "owner@localhost.invalid", name: "Owner", emailVerified: false, createdAt: now, updatedAt: now },
  });
}
