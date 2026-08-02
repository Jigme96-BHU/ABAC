"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormerPresident } from "@/content/team";

const TINTS = ["var(--gd)", "var(--orange)", "var(--gd-deep)", "#A8821A"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default function FormerPresidents({ people }: { people: FormerPresident[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const displayedPeople = [...people].reverse();
  const current = selected === null ? null : displayedPeople[selected];

  return (
    <>
      <div className="prez-stack">
        {displayedPeople.map((p, i) => (
          <button
            key={`${p.slug}-${p.tenure}`}
            className={selected === i ? "prez sel" : "prez"}
            style={{
              background: p.image ? "var(--gd-deep)" : TINTS[i % TINTS.length],
              padding: 0,
              overflow: "hidden",
            }}
            onClick={() => setSelected(i)}
            aria-label={`${p.name}, president ${p.tenure}`}
          >
            {p.image ? (
              <Image
                src={p.image}
                alt=""
                width={78}
                height={78}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials(p.name)
            )}
          </button>
        ))}
      </div>

      {current && (
        <div className="status-card" style={{ maxWidth: 380 }}>
          <h3 style={{ fontSize: 18 }}>{current.name}</h3>
          <p className="tenure" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {current.founder ? "Founder · " : ""}President
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
            Year: {current.tenure}
          </p>
        </div>
      )}
    </>
  );
}
