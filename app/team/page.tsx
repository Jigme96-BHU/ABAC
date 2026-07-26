import type { Metadata } from "next";
import Image from "next/image";
import {
  EXECUTIVE_PLACEHOLDER,
  ADVISORY_PLACEHOLDER,
  FOUNDERS_PLACEHOLDER,
  FORMER_PRESIDENTS_PLACEHOLDER,
  type PlaceholderPerson,
} from "@/content/team-placeholder";
import PlaceholderPresidents from "@/components/team/PlaceholderPresidents";

export const metadata: Metadata = {
  title: "Our team",
  robots: { index: false, follow: false }, // placeholder names — keep out of search until confirmed
  description:
    "The people who keep ABAC running — elected each year at the AGM, supported by our advisers and the presidents who came before.",
};

function PersonCard({ p }: { p: PlaceholderPerson }) {
  return (
    <div className="person">
      <div className="avatar" style={{ background: p.color, color: p.textColor }}>
        {p.photo ? (
          <Image src={p.photo} alt={p.name} fill sizes="88px" style={{ objectFit: "cover" }} />
        ) : (
          <>
            {p.initials}
            <span className="cam">📷</span>
          </>
        )}
      </div>
      <h3>{p.name}</h3>
      <p className="role">{p.role}</p>
      {p.bio && <p>{p.bio}</p>}
    </div>
  );
}

export default function TeamPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="dz-eyebrow">འགོ་ཁྲིདཔ།</span>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Our team</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, maxWidth: 640 }}>
            The people who keep ABAC running — elected each year at the AGM, supported by our
            advisers and the presidents who came before.
          </p>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              འཛིན་སྐྱོང་མཐུས་མི། སྤྱི་ལོ་ ༢༠༢༦ - ༢༠༢༧ ཚུན།
            </span>
            <h2 style={{ fontSize: 24 }}>Executive members 2026–2027</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {EXECUTIVE_PLACEHOLDER.map((p) => (
              <PersonCard p={p} key={p.name} />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              གྲོས་སྟོན་བཀོད་ཚོགས།
            </span>
            <h2 style={{ fontSize: 24 }}>Advisory board members</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {ADVISORY_PLACEHOLDER.map((p) => (
              <PersonCard p={p} key={p.name} />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              གཞི་བཙུགས་གནང་མི།
            </span>
            <h2 style={{ fontSize: 24 }}>Founders</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {FOUNDERS_PLACEHOLDER.map((p) => (
              <PersonCard p={p} key={p.name} />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              འདས་པའི་སྲིད་འཛིན།
            </span>
            <h2 style={{ fontSize: 24 }}>Former presidents</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
            Sixteen years of leadership, 2010–2026 — tap a portrait to see the name and tenure.
          </p>
          <PlaceholderPresidents people={FORMER_PRESIDENTS_PLACEHOLDER} />

          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 26 }}>
            Names and tenures shown are placeholders — photographs, biographies, and the
            confirmed presidents list (2010–2026) to be supplied by the committee.
          </p>
        </div>
      </section>
    </main>
  );
}
