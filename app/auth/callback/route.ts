import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Where Supabase sends the browser after a magic-link click. Exchanges the
 *  one-time code for a session cookie, then sends the admin on to /admin. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/admin`);
    }
  }

  return NextResponse.redirect(`${origin}/admin?error=auth`);
}
