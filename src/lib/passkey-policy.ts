import { consumeSetupToken, getOwnerUser } from "./tokens";
import { prisma } from "./prisma";

export async function authorizePasskeyRegistration(context: string | null | undefined, userId: string, userVerified: boolean) {
  if (!userVerified) throw new Error("Confirm your identity with your device to create a passkey.");
  const expectedOwner = await getOwnerUser();
  if (!expectedOwner || expectedOwner.id !== userId) throw new Error("Setup authorization does not match this account.");
  if (await prisma.passkey.count({ where: { userId: expectedOwner.id } }) >= 3) {
    throw new Error("All three passkey slots are in use.");
  }
  // Every registration, including one from an existing session, needs a PIN-authorized grant.
  const owner = await consumeSetupToken(context ?? "");
  if (!owner || owner.id !== userId) {
    throw new Error("Setup authorization is invalid, expired or already used. Ask your administrator for a new PIN.");
  }
}
