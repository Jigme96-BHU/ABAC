export type CorporateTier = "diamond" | "platinum" | "gold";

/** Order matters — this drives the tier buttons on the Corporate form, which
 *  read Gold → Platinum → Diamond (entry level first). */
export const CORPORATE_TIERS: { value: CorporateTier; label: string }[] = [
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "diamond", label: "Diamond" },
];

/** Corporate tier fees — PLACEHOLDER amounts, not yet confirmed by the
 *  committee. Search for this constant when the real fees are decided. */
export const CORPORATE_TIER_FEES_CENTS: Record<CorporateTier, number> = {
  gold: 20000, // $200 AUD/yr — placeholder
  platinum: 50000, // $500 AUD/yr — placeholder
  diamond: 100000, // $1,000 AUD/yr — placeholder
};

export function corporateTierLabel(tier: string): string {
  return CORPORATE_TIERS.find((t) => t.value === tier)?.label ?? tier;
}
