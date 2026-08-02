"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitServiceRequest } from "@/app/services/actions";
import { SERVICE_TYPES, type ServiceType } from "@/lib/service-types";

export default function ServiceRequestForm() {
  const [revealed, setRevealed] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>("letter_of_residency");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      // On success this never resolves — submitServiceRequest redirects the
      // browser to Stripe instead of returning. It only returns at all when
      // there's a validation error.
      const result = await submitServiceRequest(formData);
      if (result?.error) setError(result.error);
    });
  }

  if (!revealed) {
    return (
      <button className="btn btn-primary" onClick={() => setRevealed(true)}>
        Avail service
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="form-card" style={{ padding: 26, marginTop: 4 }}>
      <label className="f" style={{ marginTop: 0 }}>
        Which service do you need?
      </label>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {SERVICE_TYPES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={serviceType === s.value ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            onClick={() => setServiceType(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="service_type" value={serviceType} />

      <label className="f" htmlFor="sr-name">
        Your name
      </label>
      <input id="sr-name" name="requester_name" type="text" required />

      <div className="two">
        <div>
          <label className="f" htmlFor="sr-email">
            Email
          </label>
          <input id="sr-email" name="email" type="email" required placeholder="name@email.com" />
        </div>
        <div>
          <label className="f" htmlFor="sr-phone">
            Phone
          </label>
          <input id="sr-phone" name="phone" type="text" required placeholder="04xx xxx xxx" />
        </div>
      </div>

      <label className="f" htmlFor="sr-passport">
        Passport <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(required)</span>
      </label>
      <input id="sr-passport" name="passport" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required />

      <label className="f" htmlFor="sr-visa">
        Visa <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(if applicable)</span>
      </label>
      <input id="sr-visa" name="visa" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />

      <label className="f" htmlFor="sr-license">
        License <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(if applicable)</span>
      </label>
      <input id="sr-license" name="license" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />

      <label className="f" htmlFor="sr-residency">
        Proof of residency <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(if applicable)</span>
      </label>
      <input id="sr-residency" name="proof_of_residency" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />

      <label className="f" htmlFor="sr-notes">
        Anything else the committee should know? <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
      </label>
      <textarea id="sr-notes" name="notes" rows={3} />

      <label className="consent" style={{ marginTop: 20 }}>
        <input type="checkbox" required />I confirm these documents are genuine and agree to the{" "}
        <a href="/privacy">privacy statement</a>.
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={pending}>
        {pending ? "Please wait…" : "Pay $10 and submit request"}
      </button>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
        Payment is processed by Stripe — card details never touch the ABAC website. The
        committee will contact you within 3–4 working days.
      </p>
    </form>
  );
}
