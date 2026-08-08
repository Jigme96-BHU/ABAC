import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ADVISORY_BOARD, EXECUTIVE, FORMER_PRESIDENTS } from "@/content/team";
import { FOUNDERS } from "@/content/founders";
import FormerPresidents from "@/components/FormerPresidents";

export const metadata: Metadata = {
  title: "Our leadership team",
  description:
    "The people who keep ABAC running — elected each year at the AGM and supported by our advisers, founders, former presidents and the every Bhutanese.",
};

type TeamPerson = {
  name: string;
  role: string;
  bio?: string;
  image?: string | null;
};

type OrbitStyle = CSSProperties & {
  "--orbit-x": string;
  "--orbit-y": string;
};

const TINTS = ["var(--gd)", "var(--orange)", "var(--gd-deep)", "var(--gold)"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

function PersonCard({
  p,
  index,
  variant = "default",
  featured = false,
}: {
  p: TeamPerson;
  index: number;
  variant?: "default" | "executive" | "orbit" | "advisoryCenter";
  featured?: boolean;
}) {
  const className = [
    "person",
    variant === "executive" ? "exec-person" : "",
    variant === "orbit" ? "orbit-person" : "",
    variant === "advisoryCenter" ? "advisory-center-card" : "",
    featured ? "exec-president" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      tabIndex={variant === "executive" ? 0 : undefined}
      aria-label={
        variant === "executive" && p.bio ? `${p.name}, ${p.role}. ${p.bio}` : undefined
      }
    >
      <div
        className="avatar"
        style={{
          background: p.image ? "var(--gd-deep)" : TINTS[index % TINTS.length],
          color: TINTS[index % TINTS.length] === "var(--gold)" ? "#3D2E05" : "#fff",
        }}
      >
        {p.image ? (
          <Image src={p.image} alt={p.name} fill sizes="112px" />
        ) : (
          initials(p.name)
        )}
      </div>
      <h3>{p.name}</h3>
      {p.role && <p className="role">{p.role}</p>}
      {p.bio && <p className={variant === "executive" ? "exec-bio" : undefined}>{p.bio}</p>}
    </div>
  );
}

function orbitPosition(index: number, total: number): OrbitStyle {
  const angle = -90 + (360 / total) * index;
  const radians = (angle * Math.PI) / 180;
  const x = 50 + 39.6 * Math.cos(radians);
  const y = 50 + 39.6 * Math.sin(radians);

  return {
    "--orbit-x": `${x}%`,
    "--orbit-y": `${y}%`,
  };
}

export default function TeamPage() {
  const president = EXECUTIVE.find((p) => p.role === "President");
  const executiveMembers = EXECUTIVE.filter((p) => p !== president);
  const advisoryChairperson = ADVISORY_BOARD.find((p) => p.role === "Chairperson");
  const advisoryMembers = ADVISORY_BOARD.filter((p) => p !== advisoryChairperson);

  return (
    <main>
      <section className="block">
        <div className="wrap">
          <div className="page-head">
            <span className="dz-eyebrow">འགོ་ཁྲིདཔ།</span>
            <h1>Our leadership team</h1>
            <p>
              The people who keep ABAC running — elected each year at the AGM and supported
              by our advisers, founders, former presidents and the every Bhutanese.
            </p>
          </div>

          <div className="section-head">
            <span className="dz-eyebrow">
              འཛིན་སྐྱོང་མཐུས་མི། སྤྱི་ལོ་ ༢༠༢༦ - ༢༠༢༧ ཚུན།
            </span>
            <h2>Executive members 2026–2027</h2>
          </div>
          <div className="exec-layout">
            {president && (
              <div className="exec-president-row">
                <PersonCard
                  p={president}
                  index={0}
                  key={president.slug}
                  variant="executive"
                  featured
                />
              </div>
            )}
            <div className="exec-grid">
              {executiveMembers.map((p, index) => (
                <PersonCard
                  p={p}
                  index={index + 1}
                  key={p.slug}
                  variant="executive"
                />
              ))}
            </div>
          </div>

          <div className="section-head">
            <span className="dz-eyebrow">གྲོས་སྟོན་བཀོད་ཚོགས།</span>
            <h2>Advisory board members</h2>
          </div>
          <div className="advisory-orbit">
            {advisoryChairperson && (
              <div className="advisory-center-slot">
                <PersonCard
                  p={advisoryChairperson}
                  index={0}
                  key={advisoryChairperson.slug}
                  variant="advisoryCenter"
                />
              </div>
            )}
            <div className="advisory-ring">
              {advisoryMembers.map((p, index) => (
                <div
                  className="advisory-orbit-slot"
                  style={orbitPosition(index, advisoryMembers.length)}
                  key={p.slug}
                >
                  <PersonCard p={p} index={index + 1} variant="orbit" />
                </div>
              ))}
            </div>
          </div>

          <div className="section-head">
            <span className="dz-eyebrow">གཞི་བཙུགས་གནང་མི།</span>
            <h2>Founders</h2>
          </div>
          <div className="team-grid">
            {FOUNDERS.map((p, index) => (
              <PersonCard
                p={{ name: p.name, role: "Founder", image: p.image }}
                index={index}
                key={p.slug}
              />
            ))}
          </div>

          <div className="section-head">
            <span className="dz-eyebrow">སྲིད་འཛིན་བགྲེསཔ།</span>
            <h2>Former presidents</h2>
            <p className="section-sub">
              ABAC acknowledges the leadership and service of the presidents who have guided
              the Association since its founding.
            </p>
          </div>
          <FormerPresidents people={FORMER_PRESIDENTS} />
        </div>
      </section>
    </main>
  );
}
