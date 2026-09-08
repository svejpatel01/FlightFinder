"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("idle");
        setMessage(data?.error ?? "Something went wrong.");
        return;
      }
      setState("sent");
      setMessage(
        data?.message ?? "If that address is invited, a link is on its way.",
      );
    } catch {
      setState("idle");
      setMessage("Network error — try again.");
    }
  }

  if (state === "sent") {
    return (
      <div className="notice notice-ok" style={{ margin: 0 }}>
        {message} Check your inbox and click the link. It expires in 15 minutes.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {message && <div className="notice notice-err">{message}</div>}
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        type="submit"
        className="btn-primary"
        style={{ marginTop: 14 }}
        disabled={state === "sending" || !/.+@.+\..+/.test(email)}
      >
        {state === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}
