import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="wrap">
      <h1>FlightFinder</h1>
      <p className="sub">
        Watch cheap round-trip weekend flights between your home airports and a
        wishlist of destinations. Get an email — or an SMS for the big ones —
        when a fare drops below your budget or well below its recent average.
      </p>

      <div className="card">
        <h2>How it works</h2>
        <ol className="steps">
          <li>Sign in with a magic link (invite-only).</li>
          <li>
            Set your origins, destination wishlist, budget, and which weekends to
            watch.
          </li>
          <li>
            A scan runs every 6 hours. Noteworthy drops trigger an email/SMS; the
            dashboard always shows the current cheapest fares.
          </li>
        </ol>
        <p style={{ marginTop: 18 }}>
          <Link href="/login" className="btn btn-primary" style={{ display: "inline-block", width: "auto" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
