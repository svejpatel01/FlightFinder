// Invite allowlist. Sign-in is only offered to addresses that have an Invite
// row (or are already a User). Manage with `npm run invite`.

import { prisma } from "./db";
import { normalizeEmail } from "./auth";

/** Idempotently ensure OWNER_EMAIL is always allowed in. */
export async function ensureOwnerInvite(): Promise<void> {
  const owner = process.env.OWNER_EMAIL ? normalizeEmail(process.env.OWNER_EMAIL) : "";
  if (!owner) return;
  await prisma.invite.upsert({
    where: { email: owner },
    update: {},
    create: { email: owner, invitedBy: "system", note: "OWNER_EMAIL" },
  });
}

export async function isInvited(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  const [invite, user] = await Promise.all([
    prisma.invite.findUnique({ where: { email: e } }),
    prisma.user.findUnique({ where: { email: e } }),
  ]);
  return Boolean(invite || user);
}

/** Mark an invite claimed on first successful sign-in. */
export async function claimInvite(email: string): Promise<void> {
  await prisma.invite.updateMany({
    where: { email: normalizeEmail(email), claimedAt: null },
    data: { claimedAt: new Date() },
  });
}

export async function addInvite(email: string, note?: string) {
  return prisma.invite.upsert({
    where: { email: normalizeEmail(email) },
    update: { note: note ?? undefined },
    create: { email: normalizeEmail(email), invitedBy: "cli", note },
  });
}

export async function removeInvite(email: string) {
  return prisma.invite.deleteMany({ where: { email: normalizeEmail(email) } });
}

export async function listInvites() {
  return prisma.invite.findMany({ orderBy: { createdAt: "asc" } });
}
