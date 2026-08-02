import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mailer, MAIL_FROM } from "@/lib/mail";
import { formatDate, formatMemberNo } from "@/lib/member-number";
import { expiryReminderEmail, type ExpiryReminderKind } from "@/lib/emails/expiry-reminder";

export const dynamic = "force-dynamic";

type ReminderRow = {
  member_id: string;
  email: string;
  name: string;
  member_no: number;
  member_year: number;
  expires_at: string;
  reminder_kind: ExpiryReminderKind;
};

function todayInSydney() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || cronSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = todayInSydney();
  const { data, error } = await supabase
    .rpc("get_members_due_for_expiry_reminders", { p_today: today })
    .returns<ReminderRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminders: ReminderRow[] = Array.isArray(data) ? data : [];
  const sent: { memberId: string; kind: ExpiryReminderKind; email: string }[] = [];
  const failed: { memberId: string; kind: ExpiryReminderKind; email: string; error: string }[] = [];

  for (const reminder of reminders) {
    try {
      const { subject, text, html } = expiryReminderEmail({
        name: reminder.name,
        memberNo: formatMemberNo(reminder.member_no, reminder.member_year),
        validUntil: formatDate(reminder.expires_at),
        kind: reminder.reminder_kind,
      });

      await mailer.sendMail({
        from: MAIL_FROM,
        to: reminder.email,
        subject,
        text,
        html,
      });

      const { error: markError } = await supabase.rpc("mark_member_expiry_reminder_sent", {
        p_member_id: reminder.member_id,
        p_reminder_kind: reminder.reminder_kind,
      });

      if (markError) throw markError;

      sent.push({
        memberId: reminder.member_id,
        kind: reminder.reminder_kind,
        email: reminder.email,
      });
    } catch (err) {
      failed.push({
        memberId: reminder.member_id,
        kind: reminder.reminder_kind,
        email: reminder.email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    today,
    checked: reminders.length,
    sent: sent.length,
    failed,
  });
}
