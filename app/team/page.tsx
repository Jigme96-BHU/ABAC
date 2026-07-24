import type { Metadata } from "next";
import Image from "next/image";
import { EXECUTIVE, FORMER_PRESIDENTS } from "@/content/team";
import FormerPresidents from "@/components/FormerPresidents";

export const metadata: Metadata = {
  title: "Our team",
  description:
    "The ABAC executive committee for 2026–2027, and the former presidents who have led the Australia–Bhutan Association of Canberra since 2010.",
};

const TINTS = ["var(--gd)", "var(--orange)", "var(--gd-deep)", "#A8821A"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default function TeamPage() {
  return (
    <main>
      <section className="block">
        <div className="wrap">
          <span className="dz-eyebrow">ང་བཅས་ཀྱི་སྡེ་ཚན</span>
          <h2 style={{ fontSize: 32, marginBottom: 6 }}>Our team</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
            The volunteers who run ABAC — elected by members at the annual general meeting.
          </p>

          <div className="section-head">
            <h2 style={{ fontSize: 24 }}>Executive members 2026–2027</h2>
          </div>

          <div className="team-grid">
            {EXECUTIVE.map((p, i) => (
              <div className="person" key={p.slug}>
                <div
                  className="avatar"
                  style={{
                    background: p.image ? "var(--gd-deep)" : TINTS[i % TINTS.length],
                    overflow: "hidden",
                  }}
                >
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      width={88}
                      height={88}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    initials(p.name)
                  )}
                </div>
                <h3>{p.name}</h3>
                <p className="role">{p.role}</p>
                <p>{p.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block alt">
        <div className="wrap">
          <div className="section-head">
            <span className="dz-eyebrow">སྔོན་གྱི་འགོ་ཁྲིདཔ</span>
            <h2>Former presidents</h2>
          </div>
          <p style={{ color: "var(--ink-soft)", marginBottom: 20, maxWidth: 560 }}>
            Select a portrait to see who served and when. ABAC has been led by community
            volunteers since it was founded in 2010.
          </p>
          <FormerPresidents people={FORMER_PRESIDENTS} />
        </div>
      </section>
    </main>
  );
}
