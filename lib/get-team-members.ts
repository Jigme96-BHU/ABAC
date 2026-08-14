import { createClient } from "@/lib/supabase/server";
import type { TeamMemberRow } from "@/lib/supabase/types";

export type TeamCategory = "executive" | "founders" | "advisory" | "former_presidents";

export const CATEGORY_LABELS: Record<TeamCategory, string> = {
  executive: "Executive",
  founders: "Founders",
  advisory: "Advisory Board",
  former_presidents: "Former Presidents",
};

/** Fetch all active team members, grouped by category. */
export async function getTeamMembersByCategory(): Promise<Record<TeamCategory, TeamMemberRow[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true })
    .returns<TeamMemberRow[]>();

  const grouped: Record<TeamCategory, TeamMemberRow[]> = {
    executive: [],
    founders: [],
    advisory: [],
    former_presidents: [],
  };

  (data ?? []).forEach((member) => {
    grouped[member.category].push(member);
  });

  return grouped;
}
