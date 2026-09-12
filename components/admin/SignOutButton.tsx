"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Best-effort — the session cookie may already be gone; refreshing
      // still gets the admin back to a sane state either way.
    }
    router.refresh();
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
      Sign out
    </button>
  );
}
