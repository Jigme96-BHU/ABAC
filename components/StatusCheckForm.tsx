"use client";

import { useState, useTransition, type FormEvent } from "react";
import { checkMembershipStatus, type StatusResult } from "@/app/join/actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Payment pending",
  expired: "Expired",
};

export default function StatusCheckForm() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      setResult(await checkMembershipStatus(formData));
    });
  }

  return (
    <div id="status">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: open ? 14 : 0 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Already a member? Check my status
      </button>

      {open && (
        <div className="pay-box">
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 4 }}>
            No login needed — enter the email and date of birth you registered with. Both
            must match your record.
          </p>

          <form onSubmit={submit}>
            <label className="f" htmlFor="s-email">
              Email
            </label>
            <input id="s-email" name="email" type="email" required placeholder="name@email.com" />

            <label className="f" htmlFor="s-dob">
              Date of birth
            </label>
            <input id="s-dob" name="dob" type="date" required />

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              disabled={pending}
            >
              {pending ? "Checking…" : "Check status"}
            </button>
          </form>

          {result && !result.found && (
            <div className="notice warn" style={{ marginTop: 16 }}>
              No matching record found. Check both details and try again.
            </div>
          )}

          {result?.found && (
            <div className="status-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <strong style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 17 }}>
                  {result.memberNo}
                </strong>
                <span className={`badge ${result.status === "active" ? "active" : "due"}`}>
                  {STATUS_LABEL[result.status]}
                </span>
              </div>
              <table>
                <tbody>
                  <tr>
                    <td>Membership no.</td>
                    <td>{result.memberNo}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>{STATUS_LABEL[result.status]}</td>
                  </tr>
                  {result.expiresAt && (
                    <tr>
                      <td>Valid until</td>
                      <td>
                        {new Date(result.expiresAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
