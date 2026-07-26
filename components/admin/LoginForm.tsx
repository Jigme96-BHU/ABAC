"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="notice ok">
        Check <strong>{email}</strong> for a sign-in link. It expires after a few minutes —
        come back here and request a new one if it doesn&apos;t arrive.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="f" htmlFor="admin-email">
        Committee email
      </label>
      <input
        id="admin-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 16 }}
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
      {status === "error" && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          Something went wrong sending the link. Try again in a moment.
        </div>
      )}
    </form>
  );
}
