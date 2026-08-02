import type { Metadata } from "next";
import VolunteerForm from "@/components/VolunteerForm";

export const metadata: Metadata = {
  title: "Volunteer registration",
  description:
    "Register to volunteer with the Australia–Bhutan Association of Canberra — help with events, culture, and community welfare programs.",
};

export default function VolunteersPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="form-card">
            <h2>Volunteer registration</h2>
            <p className="form-sub">
              ABAC runs on volunteers — events, culture and language programs, and community
              welfare all depend on people willing to give their time. Register below and the
              committee will be in touch about upcoming opportunities.
            </p>

            <VolunteerForm />
          </div>
        </div>
      </section>
    </main>
  );
}
