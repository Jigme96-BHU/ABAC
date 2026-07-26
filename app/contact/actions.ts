"use server";

import { mailer, MAIL_FROM } from "@/lib/mail";
import { contactNotifyEmail } from "@/lib/emails/contact-notify";
import { contactConfirmationEmail } from "@/lib/emails/contact-confirmation";

const COMMITTEE_EMAIL = "bhutancanberra@gmail.com";

export async function submitContactMessage(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and message." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const notify = contactNotifyEmail({ name, email, message });
  try {
    await mailer.sendMail({
      from: MAIL_FROM,
      to: COMMITTEE_EMAIL,
      replyTo: email,
      subject: notify.subject,
      text: notify.text,
      html: notify.html,
    });
  } catch (err) {
    console.error("contact notify email failed", err);
    return { ok: false, error: "Something went wrong sending your message. Please email us directly instead." };
  }

  try {
    const confirmation = contactConfirmationEmail({ name });
    await mailer.sendMail({
      from: MAIL_FROM,
      to: email,
      subject: confirmation.subject,
      text: confirmation.text,
      html: confirmation.html,
    });
  } catch (err) {
    console.error("contact confirmation email failed", err);
  }

  return { ok: true };
}
