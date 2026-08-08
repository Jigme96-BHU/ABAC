import Image from "next/image";
import type { FormerPresident } from "@/content/team";

const TINTS = ["var(--gd)", "var(--orange)", "var(--gd-deep)", "#A8821A"];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

const year = (tenure: string) => tenure.replace("-", " - ");

export default function FormerPresidents({ people }: { people: FormerPresident[] }) {
  const displayedPeople = [...people].reverse();

  return (
    <div className="prez-stack">
      {displayedPeople.map((p, i) => (
        <div
          key={`${p.slug}-${p.tenure}`}
          className="prez"
          tabIndex={0}
          aria-label={`${p.name}, president. Year: ${year(p.tenure)}`}
        >
          <span
            className="prez-face"
            style={{
              background: p.image ? "var(--gd-deep)" : TINTS[i % TINTS.length],
            }}
          >
            {p.image ? (
              <Image
                src={p.image}
                alt=""
                width={88}
                height={88}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              initials(p.name)
            )}
          </span>
          <span className="prez-tip" aria-hidden="true">
            <strong>{p.name}</strong>
            <em>Year: {year(p.tenure)}</em>
          </span>
        </div>
      ))}
    </div>
  );
}
