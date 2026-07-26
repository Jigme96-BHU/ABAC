import "server-only";
import nodemailer from "nodemailer";

/** Server-only Gmail SMTP transporter. Requires 2-Step Verification on the
 *  sending account plus an App Password (Google Account → Security → App
 *  passwords) — a regular Gmail password will not authenticate here. */
export const mailer = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const MAIL_FROM = `Australia–Bhutan Association of Canberra <${process.env.GMAIL_USER}>`;
