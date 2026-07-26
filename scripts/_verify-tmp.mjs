import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  "https://ooywyhednfgjisdondtg.supabase.co",
  "sb_publishable_Gm3nmczFWc1yTEc3JdlSAQ_mL9MhjvF",
);

const id = crypto.randomUUID();
const email = "under18-probe@example.com";
const name = "Under Eighteen Probe";
const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

console.log("1. inserting free/under-18 row...");
const { error: insertError } = await supabase.from("members").insert({
  id, email, name,
  date_of_birth: "2015-01-01",
  cid: "00000000011",
  fee_cents: 0,
  status: "active",
  joined_at: new Date().toISOString(),
  expires_at: expiresAt,
});
console.log("   insertError:", insertError);

console.log("2. calling get_membership_confirmation(null, id)...");
const { data, error: rpcError } = await supabase
  .rpc("get_membership_confirmation", { p_session_id: null, p_member_id: id })
  .maybeSingle();
console.log("   data:", data, "rpcError:", rpcError);

console.log("3. attempting to send mail...");
try {
  const mailer = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  const info = await mailer.sendMail({
    from: `Test <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "[probe] under-18 path",
    text: "probe",
  });
  console.log("   sent:", info.messageId, info.response);
} catch (err) {
  console.log("   MAIL SEND FAILED:", err);
}

console.log("4. cleanup...");
await supabase.from("members").delete().eq("email", email); // will 401 (no anon delete) — informational only
console.log("   (delete via anon key is expected to fail — cleaning up via admin note instead)");
