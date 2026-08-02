import type { Metadata } from "next";
import Link from "next/link";
import ServiceRequestForm from "@/components/ServiceRequestForm";
import { SERVICE_TYPES } from "@/lib/service-types";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Letter of Residency and Character Reference requests for the Bhutanese community in Canberra, plus general assistance from the ABAC committee.",
};

type Props = { searchParams: Promise<{ submitted?: string; canceled?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const { submitted, canceled } = await searchParams;

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">ཞབས་ཏོག་གི་དོན་ལུ་ཞུ་བ།</span>
            <h2>Service request</h2>
            <p className="form-sub">
              ABAC offers services below to support the community with formal paperwork. For
              any other assistance or anything else, please contact the committee directly.
            </p>

            {submitted === "1" && (
              <div className="notice ok">
                <strong>Payment received.</strong> Your request has been submitted — the
                committee will contact you within 3–4 working days.
              </div>
            )}
            {canceled === "1" && (
              <div className="notice warn">
                Checkout was canceled — your request wasn&apos;t submitted. You can try again
                below anytime.
              </div>
            )}

            <div style={{ display: "grid", gap: 14, margin: "20px 0" }}>
              {SERVICE_TYPES.map((s) => (
                <div
                  key={s.value}
                  style={{
                    border: "1.5px solid var(--line)",
                    borderRadius: 10,
                    padding: "14px 18px",
                  }}
                >
                  <strong>{s.label}</strong>
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "6px 0 0" }}>
                    {s.description}
                  </p>
                </div>
              ))}
            </div>

            <ServiceRequestForm />

            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <Link className="btn btn-primary" href="/contact">
                Email the committee
              </Link>
              <Link className="btn btn-ghost" href="/join">
                Become a member
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
