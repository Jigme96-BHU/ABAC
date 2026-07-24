import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Australia–Bhutan Association of Canberra. We respond to every enquiry within 2–3 working days.",
};

export default function ContactPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <span className="dz-eyebrow">འབྲེལ་བ</span>
            <h2>Contact us</h2>
            <p className="form-sub">
              We respond to every enquiry within 2–3 working days. You&apos;ll get an instant
              email confirming we&apos;ve received your message.
            </p>

            {/* No backend yet — the form is disabled rather than silently
                discarding what someone types. Phase 2 wires this to a server
                action + email. Until then, mailto is the working path. */}
            <fieldset disabled style={{ border: "none", padding: 0, margin: 0 }}>
              <label className="f" htmlFor="c-name">
                Name
              </label>
              <input id="c-name" type="text" />

              <label className="f" htmlFor="c-email">
                Email
              </label>
              <input id="c-email" type="email" placeholder="name@email.com" />

              <label className="f" htmlFor="c-msg">
                Message
              </label>
              <textarea id="c-msg" rows={5} />

              <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }}>
                Send message
              </button>
            </fieldset>

            <div className="notice warn" style={{ marginTop: 16 }}>
              This form isn&apos;t connected yet. Email us directly at{" "}
              <a href="mailto:bhutancanberra@gmail.com">bhutancanberra@gmail.com</a>.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
