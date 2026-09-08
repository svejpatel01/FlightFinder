import { z } from "zod";
import { createLoginToken, normalizeEmail } from "@/lib/auth";
import { ensureOwnerInvite, isInvited } from "@/lib/invites";
import { sendLoginLink } from "@/lib/email";

const schema = z.object({ email: z.string().trim().email() });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email address" }, { status: 422 });
  }

  const email = normalizeEmail(parsed.data.email);

  // Make sure the owner can always get in.
  await ensureOwnerInvite();

  // Generic response regardless of allowlist status (no account enumeration).
  const generic = Response.json({
    ok: true,
    message: "If that address is invited, a sign-in link is on its way.",
  });

  if (!(await isInvited(email))) {
    console.warn(`[auth] sign-in requested for non-invited address: ${email}`);
    return generic;
  }

  const result = await createLoginToken(email);
  if ("error" in result) {
    return Response.json({ ok: true, message: result.error });
  }

  const base =
    process.env.APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  const link = `${base}/api/auth/callback?token=${encodeURIComponent(result.token)}`;
  const isDev = process.env.NODE_ENV !== "production";

  try {
    await sendLoginLink(email, link);
  } catch (err) {
    console.error("[auth] failed to send login link", err);
    // In dev, the shared Resend sender can only reach the account owner's
    // address — don't hard-fail, the devLink below is enough to sign in.
    if (!isDev) {
      return Response.json(
        { error: "Could not send the sign-in email. Try again shortly." },
        { status: 502 },
      );
    }
  }

  // Dev convenience: surface the link so you can sign in without opening email.
  // Never happens with NODE_ENV=production.
  if (isDev) {
    return Response.json({
      ok: true,
      message: "If that address is invited, a sign-in link is on its way.",
      devLink: link,
    });
  }

  return generic;
}
