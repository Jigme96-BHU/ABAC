"use client";

import { useEffect, useState } from "react";

/** Stripe sends someone who backs out of checkout to /join?canceled=1. Read
 *  from window rather than useSearchParams so /join can stay statically
 *  generated — a search-params read in the page itself would make the whole
 *  route render on every request. */
export default function CanceledNotice() {
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    setCanceled(new URLSearchParams(window.location.search).get("canceled") === "1");
  }, []);

  if (!canceled) return null;

  return (
    <div className="notice warn" style={{ marginBottom: 16 }}>
      Your payment wasn&apos;t completed, so your membership isn&apos;t active yet and nothing was
      charged. You can try again below with the same email, date of birth and CID.
    </div>
  );
}
