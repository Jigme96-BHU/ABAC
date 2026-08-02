export type ServiceType = "letter_of_residency" | "character_reference";

export const SERVICE_TYPES: { value: ServiceType; label: string; description: string }[] = [
  {
    value: "letter_of_residency",
    label: "Letter of Residency",
    description:
      "A formal letter confirming your residency and standing within the Bhutanese community in Canberra, for visa, migration, or official purposes.",
  },
  {
    value: "character_reference",
    label: "Character Reference",
    description:
      "A character reference letter from ABAC, supporting visa, citizenship, employment, or other applications requiring community endorsement.",
  },
];

export const SERVICE_FEE_CENTS = 1000; // $10 AUD flat, per service

export function serviceTypeLabel(serviceType: string): string {
  return SERVICE_TYPES.find((s) => s.value === serviceType)?.label ?? serviceType;
}
