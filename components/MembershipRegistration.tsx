"use client";

import { useState, type ReactNode } from "react";

type RegType = "community" | "corporate";

/** Top-level Community/Corporate choice — everything else about each
 *  category (the existing Single/Family form, the new tiered Corporate
 *  form) is owned by the page/components passed in as children, this just
 *  toggles which one shows. */
export default function MembershipRegistration({
  community,
  corporate,
}: {
  community: ReactNode;
  corporate: ReactNode;
}) {
  const [regType, setRegType] = useState<RegType>("community");

  return (
    <div>
      <label className="f" style={{ marginTop: 0 }}>
        Membership category
      </label>
      <div className="two" style={{ marginBottom: 24 }}>
        <label className="category-option">
          <input
            type="radio"
            name="regType"
            checked={regType === "community"}
            onChange={() => setRegType("community")}
          />
          <span>
            <strong>Community Membership</strong>&nbsp;— individuals and families
          </span>
        </label>
        <label className="category-option">
          <input
            type="radio"
            name="regType"
            checked={regType === "corporate"}
            onChange={() => setRegType("corporate")}
          />
          <span>
            <strong>Corporate Membership</strong>&nbsp;— businesses &amp; organisations
          </span>
        </label>
      </div>

      {regType === "community" ? community : corporate}
    </div>
  );
}
