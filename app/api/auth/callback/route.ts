import { NextResponse } from "next/server";
import {
  consumeLoginToken,
  createSession,
  setSessionCookie,
} from "@/lib/auth";
import { claimInvite } from "@/lib/invites";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const base = process.env.APP_URL?.replace(/\/$/, "") ?? url.origin;

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing`);
  }

  const email = await consumeLoginToken(token);
  if (!email) {
    return NextResponse.redirect(`${base}/login?error=expired`);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { lastLoginAt: new Date() },
    create: { email, lastLoginAt: new Date() },
  });
  await claimInvite(email);

  const sessionToken = await createSession(
    user.id,
    request.headers.get("user-agent"),
  );
  await setSessionCookie(sessionToken);

  return NextResponse.redirect(`${base}/dashboard`);
}
