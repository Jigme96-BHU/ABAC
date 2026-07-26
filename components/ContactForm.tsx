"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitContactMessage } from "@/app/contact/actions";

export default function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if (result.ok) {
        setSent(true);
        form.reset();
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  if (sent) {
    return (
      <div className="notice ok">
        <strong>Message sent.</strong> We&apos;ve emailed you a confirmation, and the
        committee will respond within 2–3 working days.
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="f" htmlFor="c-name">
        Name
      </label>
      <input id="c-name" name="name" type="text" required />

      <label className="f" htmlFor="c-email">
        Email
      </label>
      <input id="c-email" name="email" type="email" required placeholder="name@email.com" />

      <label className="f" htmlFor="c-msg">
        Message
      </label>
      <textarea id="c-msg" name="message" rows={5} required />

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 20 }}
        disabled={pending}
      >
        {pending ? "Sending…" : "Send message"}
      </button>

      {error && (
        <div className="notice warn" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
    </form>
  );
}
