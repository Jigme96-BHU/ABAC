import type { Metadata } from "next";
import Image from "next/image";
import { ADVISORY_BOARD, EXECUTIVE, FORMER_PRESIDENTS } from "@/content/team";
import { FOUNDERS } from "@/content/founders";
import FormerPresidents from "@/components/FormerPresidents";

export const metadata: Metadata = {
  title: "Our team",
  description:
    "The people who keep ABAC running — elected each year at the AGM, supported by our advisers and the presidents who came before.",
};

type TeamPerson = {
  name: string;
  role: string;
  bio?: string;
  image?: string | null;
};

const TINTS = ["var(--gd)", "var(--orange)", "var(--gd-deep)", "var(--gold)"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

function PersonCard({ p, index }: { p: TeamPerson; index: number }) {
  return (
    <div className="person">
      <div
        className="avatar"
        style={{
          background: p.image ? "var(--gd-deep)" : TINTS[index % TINTS.length],
          color: TINTS[index % TINTS.length] === "var(--gold)" ? "#3D2E05" : "#fff",
        }}
      >
        {p.image ? (
          <Image src={p.image} alt={p.name} fill sizes="88px" style={{ objectFit: "cover" }} />
        ) : (
          initials(p.name)
        )}
      </div>
      <h3>{p.name}</h3>
      {p.role && <p className="role">{p.role}</p>}
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
            The people who keep ABAC running — elected each year at the AGM and supported by
            our advisers, founders, and the presidents who came before.
          </p>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              འཛིན་སྐྱོང་མཐུས་མི། སྤྱི་ལོ་ ༢༠༢༦ - ༢༠༢༧ ཚུན།
            </span>
            <h2 style={{ fontSize: 24 }}>Executive members 2026–2027</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {EXECUTIVE.map((p, index) => (
              <PersonCard p={p} index={index} key={p.slug} />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              གྲོས་སྟོན་བཀོད་ཚོགས།
            </span>
            <h2 style={{ fontSize: 24 }}>Advisory board members</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {ADVISORY_BOARD.map((p, index) => (
              <PersonCard p={p} index={index} key={p.slug} />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              གཞི་བཙུགས་གནང་མི།
            </span>
            <h2 style={{ fontSize: 24 }}>Founders</h2>
          </div>
          <div className="team-grid" style={{ marginBottom: 48 }}>
            {FOUNDERS.map((p, index) => (
              <PersonCard
                p={{ name: p.name, role: "Founder", image: p.image }}
                index={index}
                key={p.slug}
              />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow" style={{ marginBottom: 4 }}>
              འདས་པའི་སྲིད་འཛིན།
            </span>
            <h2 style={{ fontSize: 24 }}>Former presidents</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
            ABAC acknowledges the leadership and service of the presidents who have guided
            the Association since its founding.
          </p>
          <FormerPresidents people={FORMER_PRESIDENTS} />
        </div>
      </section>
    </main>
  );
}
