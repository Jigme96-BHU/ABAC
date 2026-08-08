"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitServiceRequest, lookupMemberForService, type MemberLookup } from "@/app/services/actions";
import {
  SERVICE_TYPES,
  SERVICE_FEE_MEMBER_CENTS,
  SERVICE_FEE_NON_MEMBER_CENTS,
  formatServiceFee,
  type ServiceType,
} from "@/lib/service-types";
import { formatMemberNo } from "@/lib/member-number";

const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

type Member = Extract<MemberLookup, { ok: true }>;

export default function ServiceRequestForm() {
  const [revealed, setRevealed] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>("letter_of_residency");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [notAMember, setNotAMember] = useState(false);
  const [memberNoInput, setMemberNoInput] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();

  // Advisory only — submitServiceRequest re-checks the membership number
  // against the database and sets the real charge, so a tampered page can't
  // buy a $45 service for $10.
  const feeCents = member ? SERVICE_FEE_MEMBER_CENTS : SERVICE_FEE_NON_MEMBER_CENTS;

  function lookUp() {
    const value = memberNoInput.trim();
    setMember(null);
    setLookupError(null);
    if (!value) return;
    startLookup(async () => {
      const result = await lookupMemberForService(value);
      if (result.ok) setMember(result);
      else setLookupError(result.message);
    });
  }

  function toggleNotAMember(checked: boolean) {
    setNotAMember(checked);
    setMember(null);
    setLookupError(null);
    if (checked) setMemberNoInput("");
  }

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

      <label className="f" htmlFor="sr-member-no">
        Membership number
      </label>
      <input
        id="sr-member-no"
        name="member_no"
        type="text"
        value={memberNoInput}
        onChange={(e) => {
          setMemberNoInput(e.target.value);
          setMember(null);
          setLookupError(null);
        }}
        onBlur={lookUp}
        disabled={notAMember}
        required={!notAMember}
        placeholder="ABAC-2026-000123"
      />
      <label className="consent" style={{ marginTop: 10 }}>
        <input
          type="checkbox"
          name="not_a_member"
          checked={notAMember}
          onChange={(e) => toggleNotAMember(e.target.checked)}
        />
        I&apos;m not an ABAC member
      </label>

      {looking && (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>Checking…</p>
      )}
      {member && (
        <div className="notice ok" style={{ marginTop: 10 }}>
          <strong>{member.name}</strong>
          <br />
          {member.emailMasked} · {formatMemberNo(member.memberNo, member.memberYear)}
        </div>
      )}
      {lookupError && (
        <div className="notice warn" style={{ marginTop: 10 }}>
          {lookupError}
        </div>
      )}

      <label className="f" htmlFor="sr-name">
        Your name
      </label>
      <input
        id="sr-name"
        name="requester_name"
        type="text"
        required
        defaultValue={member?.name ?? ""}
        key={member?.memberNo ?? "no-member"}
      />

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
      <input id="sr-passport" name="passport" type="file" accept={FILE_ACCEPT} required />

      <label className="f" htmlFor="sr-visa">
        Visa <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(required)</span>
      </label>
      <input id="sr-visa" name="visa" type="file" accept={FILE_ACCEPT} required />

      <label className="f" htmlFor="sr-photo-id">
        Proof of ID{" "}
        <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>
          (Australian Driving Licence or Photo ID — required)
        </span>
      </label>
      <input id="sr-photo-id" name="photo_id" type="file" accept={FILE_ACCEPT} required />

      <label className="f" htmlFor="sr-residency">
        Proof of Residency{" "}
        <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>
          (Utility Bill or Employment Contract — required)
        </span>
      </label>
      <input id="sr-residency" name="proof_of_residency" type="file" accept={FILE_ACCEPT} required />

      <label className="f" htmlFor="sr-notes">
        Anything else the committee should know? <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(optional)</span>
      </label>
      <textarea id="sr-notes" name="notes" rows={3} />

      <label className="consent" style={{ marginTop: 20 }}>
        <input type="checkbox" required />I confirm these documents are genuine and agree to the{" "}
        <a href="/privacy">privacy statement</a>.
      </label>

      <div className="pay-box fee-box" style={{ marginTop: 18 }}>
        <div className="pay-head">
          <strong>{member ? "Member fee" : "Non-member fee"}</strong>
          <span className="fee">{formatServiceFee(feeCents)}</span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
          {member
            ? "Your membership number was confirmed, so the member rate applies."
            : `Services are ${formatServiceFee(SERVICE_FEE_MEMBER_CENTS)} for ABAC members and ${formatServiceFee(SERVICE_FEE_NON_MEMBER_CENTS)} otherwise. Enter your membership number above to pay the member rate.`}
        </p>
      </div>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={pending}>
        {pending ? "Please wait…" : `Pay ${formatServiceFee(feeCents)} and submit request`}
      </button>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, textAlign: "center" }}>
        Payment is processed by Stripe — card details never touch the ABAC website. The
        committee will contact you within 3–4 working days.
      </p>
    </form>
  );
}
