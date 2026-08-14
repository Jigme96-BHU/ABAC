import { createClient } from "@/lib/supabase/server";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { corporateExpiryReminderEmail } from "@/lib/emails/corporate-expiry-reminder";

const CRON_SECRET = process.env.CRON_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bhutaneseincanberra.org.au";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Get all active corporate members that expire soon or have just expired
    // 14 days before expiry or today
    const today = new Date();
    const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: members, error: fetchError } = await supabase
      .from("corporate_members")
      .select("id, business_name, email, tier, expires_at, reminder_14d_sent, reminder_expiry_sent")
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", twoWeeksFromNow.toISOString().split("T")[0])
      .gte("expires_at", today.toISOString().split("T")[0]);

    if (fetchError) {
      console.error("Error fetching corporate members:", fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    let remindersSent = 0;
    const renewalLink = `${SITE_URL}/join`;

    for (const member of members || []) {
      const expiryDate = new Date(member.expires_at);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let shouldSendReminder = false;
      let reminderType: "14d" | "expiry" = "14d";

      if (daysUntilExpiry === 14 && !member.reminder_14d_sent) {
        shouldSendReminder = true;
        reminderType = "14d";
      } else if (daysUntilExpiry === 0 && !member.reminder_expiry_sent) {
        shouldSendReminder = true;
        reminderType = "expiry";
      }

      if (shouldSendReminder) {
        try {
          const email = corporateExpiryReminderEmail(
            member.business_name,
            member.tier,
            daysUntilExpiry,
            renewalLink
          );

          await mailer.sendMail({
            from: MAIL_FROM,
            to: member.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });

          // Mark reminder as sent
          const updateData =
            reminderType === "14d"
              ? { reminder_14d_sent: true }
              : { reminder_expiry_sent: true };

          const { error: updateError } = await supabase
            .from("corporate_members")
            .update(updateData)
            .eq("id", member.id);

          if (updateError) {
            console.error(`Failed to mark reminder sent for ${member.id}:`, updateError);
          } else {
            remindersSent++;
          }
        } catch (err) {
          console.error(`Failed to send reminder to ${member.email}:`, err);
        }
      }
    }

    return Response.json({
      success: true,
      remindersSent,
      membersChecked: (members || []).length,
    });
  } catch (err) {
    console.error("Corporate expiry reminders error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
