"use client";

import { useState } from "react";
import type { PlaceholderPresident } from "@/content/team-placeholder";

export default function PlaceholderPresidents({ people }: { people: PlaceholderPresident[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected === null ? null : people[selected];

  return (
    <>
      <div className="prez-stack">
        {people.map((p, i) => (
          <button
            key={p.name}
            className={selected === i ? "prez sel" : "prez"}
            style={{ background: p.color, color: p.textColor }}
            onClick={() => setSelected(i)}
            aria-label={`${p.name}, president ${p.tenure}`}
          >
            {p.initials}
          </button>
        ))}
      </div>

      {current && (
        <div className="status-card" style={{ maxWidth: 380 }}>
          <h3 style={{ fontSize: 18 }}>{current.name}</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>President · {current.tenure}</p>
        </div>
      )}
    </>
  );
}
