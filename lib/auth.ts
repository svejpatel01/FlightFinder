// Passwordless (magic-link) auth, rolled by hand — no password storage.
//
// Flow: POST /api/auth/request -> emailed link -> GET /api/auth/callback
// sets an httpOnly session cookie. Tokens are stored only as SHA-256 hashes.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "ff_session";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min
const LOGIN_COOLDOWN_MS = 60 * 1000; // one link per email per minute
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
function randomToken(): string {
  return randomBytes(32).toString("base64url");
}
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// --- Magic-link tokens --------------------------------------------------
export async function createLoginToken(
  email: string,
): Promise<{ token: string } | { error: string }> {
  const e = normalizeEmail(email);
  const recent = await prisma.loginToken.findFirst({
    where: { email: e, createdAt: { gt: new Date(Date.now() - LOGIN_COOLDOWN_MS) } },
  });
  if (recent) {
    return { error: "A sign-in link was just sent — check your email or wait a minute." };
  }
  const token = randomToken();
  await prisma.loginToken.create({
    data: {
      email: e,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
    },
  });
  return { token };
}

/** Validate + single-use consume. Returns the email, or null if bad/expired/used. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!row || row.consumedAt || row.expiresAt < new Date()) return null;
  await prisma.loginToken.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return row.email;
}

// --- Sessions ---------------------------------------------------------------
export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<string> {
  const token = randomToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000),
    },
  });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

/** For server components / pages: returns the user or redirects to /login. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
