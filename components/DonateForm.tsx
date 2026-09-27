"use client";

import { useState, useTransition, type FormEvent } from "react";
import { startDonation } from "@/app/donate/actions";

const AMOUNTS = [10, 25, 50, 100];

export default function DonateForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("25");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      // On success the action redirects to Stripe and never returns.
      const result = await startDonation(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="id-pills" role="group" aria-label="Choose an amount">
        {AMOUNTS.map((a) => (
          <button
            type="button"
            key={a}
            className={`id-pill${amount === String(a) ? " sel" : ""}`}
            aria-pressed={amount === String(a)}
            onClick={() => setAmount(String(a))}
            style={{ cursor: "pointer" }}
          >
            ${a}
          </button>
        ))}
      </div>

      <label className="f" htmlFor="d-amount">
        Amount (AUD)
      </label>
      <input
        id="d-amount"
        name="amount"
        type="text"
        inputMode="decimal"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {error && (
        <div className="notice warn" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 20 }}
        disabled={pending}
      >
        {pending ? "Opening secure checkout…" : "Donate"}
      </button>
    </form>
  );
}
