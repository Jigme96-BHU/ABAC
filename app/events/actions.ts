"use server";

import { createClient } from "@/lib/supabase/server";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { eventRsvpConfirmationEmail } from "@/lib/emails/event-rsvp-confirmation";
import { formatDate } from "@/lib/member-number";

export type RsvpResult = { ok: boolean; error?: string };

/** RSVPs are never gated on payment or approval — this can email a
 *  confirmation immediately on a successful insert, unlike the
 *  payment-gated confirmations elsewhere in this app. */
export async function submitEventRsvp(
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  formData: FormData
): Promise<RsvpResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !email || !phone) {
    return { ok: false, error: "Please fill in your name, email, and phone." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("event_rsvps").insert({ event_id: eventId, name, email, phone });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already RSVPed for this event with that email." };
    }
    return { ok: false, error: error.message };
  }

  // Best-effort — a mail hiccup shouldn't block a valid RSVP.
  try {
    const { subject, text, html } = eventRsvpConfirmationEmail({
      name,
      eventTitle,
      eventDate: formatDate(eventDate),
      eventLocation,
    });
    await mailer.sendMail({ from: MAIL_FROM, to: email, subject, text, html });
  } catch (err) {
    console.error("event RSVP confirmation email failed:", err);
  }

  return { ok: true };
}
