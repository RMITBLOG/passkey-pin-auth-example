import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";
import { hashSetupToken } from "./tokens";

function digest(pin: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32 || secret.includes("replace-with-")) throw new Error("A strong authentication secret is required.");
  return createHmac("sha256", secret).update(`owner-setup-pin:${pin}`).digest("hex");
}

// Operator only. Stop the app before calling, including when replacing a PIN,
// so no in-flight registration can outlive revocation.
export async function issueSetupPin(reset = false) {
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  let pin = "";
  await prisma.$transaction(async (tx) => {
    if (!await tx.user.findUnique({ where: { id: "owner" } })) throw new Error("Provision the owner first.");
    if (reset) {
      await tx.session.deleteMany({ where: { userId: "owner" } });
      await tx.passkey.deleteMany({ where: { userId: "owner" } });
      await tx.verification.deleteMany();
      await tx.setupToken.deleteMany();
      await tx.setupPin.deleteMany();
      await tx.setupRateLimit.deleteMany();
    } else {
      const now = new Date();
      // Claimed and expired PINs no longer reserve a slot. The corresponding
      // unconsumed registration grant, if any, is counted separately.
      await tx.setupPin.deleteMany({ where: { OR: [{ claimedAt: { not: null } }, { expiresAt: { lte: now } }] } });
      // Issuance is operator-only while the app is stopped. Count every pending
      // PIN and grant as a reserved device slot so enrollment cannot exceed 3.
      const [keys, pins, grants] = await Promise.all([
        tx.passkey.count({ where: { userId: "owner" } }),
        tx.setupPin.count({ where: { claimedAt: null, expiresAt: { gt: now } } }),
        tx.setupToken.count({ where: { pinVerified: true, usedAt: null, expiresAt: { gt: now } } }),
      ]);
      if (keys + pins + grants >= 3) throw new Error("All three device slots are in use.");
    }
    const [keys, activePins, activeGrants] = await Promise.all([
      tx.passkey.count({ where: { userId: "owner" } }),
      tx.setupPin.count({ where: { claimedAt: null, expiresAt: { gt: new Date() } } }),
      tx.setupToken.count({ where: { pinVerified: true, usedAt: null, expiresAt: { gt: new Date() } } }),
    ]);
    const slot = keys + activePins + activeGrants + 1;
    if (slot > 3) throw new Error("All three device slots are in use.");
    pin = `${slot}${randomInt(10_000_000).toString().padStart(7, "0")}`;
    // The primary key is the slot claim. Concurrent operators racing to issue
    // the same slot cannot both create a PIN.
    await tx.setupPin.create({ data: { id: `slot-${slot}`, pinHash: digest(pin), expiresAt } });
  });
  return { pin, expiresAt };
}

export async function exchangeSetupPin(pin: string) {
  if (!/^\d{8}$/.test(pin)) return null;
  const candidate = Buffer.from(digest(pin), "hex");
  const slot = Number(pin[0]);
  if (slot < 1 || slot > 3) return null;
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const allow = async (id: string, limit: number) => {
      await tx.setupRateLimit.updateMany({
        where: { id, windowStart: { lte: new Date(now.getTime() - 15 * 60_000) } },
        data: { windowStart: now, attempts: 0 },
      });
      const counter = await tx.setupRateLimit.upsert({
        where: { id },
        create: { id, windowStart: now, attempts: 1 },
        update: { attempts: { increment: 1 } },
      });
      return counter.attempts <= limit;
    };
    // A public request header cannot establish a trusted client identity.
    // One shared bucket keeps the number of persistent rows fixed.
    if (!await allow("setup-pin", 500)) return null;
    if (await tx.passkey.count({ where: { userId: "owner" } }) >= 3) return null;
    const row = await tx.setupPin.findUnique({ where: { id: `slot-${slot}` } });
    if (!row || row.claimedAt || row.expiresAt <= now) return null;
    const expected = Buffer.from(row.pinHash, "hex");
    // The global rate-limit update commits on failure without burning the PIN.
    if (expected.length !== candidate.length || !timingSafeEqual(expected, candidate)) return null;
    const claimed = await tx.setupPin.updateMany({ where: { id: row.id, claimedAt: null, expiresAt: { gt: new Date() } }, data: { claimedAt: new Date() } });
    if (claimed.count !== 1) return null;
    const token = randomBytes(32).toString("base64url");
    await tx.setupToken.create({ data: { id: randomUUID(), tokenHash: hashSetupToken(token), pinVerified: true, expiresAt: new Date(Date.now() + 10 * 60_000) } });
    return token;
  });
}
