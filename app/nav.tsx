import Link from "next/link";

export default function Nav({ email }: { email: string | null }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href={email ? "/dashboard" : "/"} className="nav-brand">
          Flight<span>Finder</span>
        </Link>
        <nav className="nav-links">
          {email ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/settings">Settings</Link>
              <span className="nav-email">{email}</span>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="nav-signout">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
