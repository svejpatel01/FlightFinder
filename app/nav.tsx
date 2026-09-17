import Link from "next/link";

export default function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/dashboard" className="nav-brand">
          Notif<span>lyer</span>
        </Link>
        <a
          className="nav-back"
          href="https://svej.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          svej.org <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  );
}
