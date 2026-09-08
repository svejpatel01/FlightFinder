import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "That sign-in link was incomplete. Request a new one.",
  expired: "That sign-in link has expired or was already used. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const sp = await searchParams;
  const errorKey = typeof sp.error === "string" ? sp.error : "";

  return (
    <div className="wrap wrap-narrow">
      <h1>Sign in</h1>
      <p className="sub">
        Enter your email and we&apos;ll send a one-time sign-in link. Access is
        invite-only.
      </p>
      {errorKey && ERRORS[errorKey] && (
        <div className="notice notice-err">{ERRORS[errorKey]}</div>
      )}
      <div className="card">
        <LoginForm />
      </div>
    </div>
  );
}
