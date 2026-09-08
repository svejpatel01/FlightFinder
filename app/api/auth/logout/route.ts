import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, clearSessionCookie, destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  await clearSessionCookie();
  const base =
    process.env.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  return NextResponse.redirect(`${base}/`, { status: 303 });
}
