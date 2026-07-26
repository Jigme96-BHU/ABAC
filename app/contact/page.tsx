import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

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
            <span className="dz-eyebrow">འབྲེལ་བ།</span>
            <h2>Contact us</h2>
            <p className="form-sub">
              We respond to every enquiry within 2–3 working days. You&apos;ll get an instant
              email confirming we&apos;ve received your message.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
