"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { startDonation } from "@/app/donate/actions";

const AMOUNTS = ["10", "25", "50", "100"];
const OTHER = "other";

export default function DonateForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState("25");
  const [other, setOther] = useState("");
  const otherRef = useRef<HTMLInputElement>(null);

  const amount = choice === OTHER ? other : choice;

  function pickOther() {
    setChoice(OTHER);
    // Focus after React shows the input.
    requestAnimationFrame(() => otherRef.current?.focus());
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("amount", amount);
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
            className={`id-pill${choice === a ? " sel" : ""}`}
            aria-pressed={choice === a}
            onClick={() => setChoice(a)}
            style={{ cursor: "pointer" }}
          >
            ${a}
          </button>
        ))}
        <button
          type="button"
          className={`id-pill${choice === OTHER ? " sel" : ""}`}
          aria-pressed={choice === OTHER}
          onClick={pickOther}
          style={{ cursor: "pointer" }}
        >
          Other amount
        </button>
      </div>

      {choice === OTHER && (
        <>
          <label className="f" htmlFor="d-amount">
            Enter amount (AUD)
          </label>
          <input
            ref={otherRef}
            id="d-amount"
            type="text"
            inputMode="decimal"
            required
            placeholder="e.g. 75"
            value={other}
            onChange={(e) => setOther(e.target.value)}
          />
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
            Any amount from $2 to $10,000.
          </p>
        </>
      )}

      {error && (
        <div className="notice warn" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 20 }}
        disabled={pending || !amount}
      >
        {pending ? "Opening secure checkout…" : amount ? `Donate $${amount.replace(/^\$/, "")}` : "Donate"}
      </button>
    </form>
  );
}
