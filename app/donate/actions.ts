"use server";

import { redirect } from "next/navigation";
import { stripeDonations } from "@/lib/stripe";

const MIN_DONATION_CENTS = 200; // $2 — below this Stripe's fee eats most of it
const MAX_DONATION_CENTS = 1_000_000; // $10,000 — larger gifts by bank transfer

export type DonateResult = { error: string };

export async function startDonation(formData: FormData): Promise<DonateResult> {
  if (!stripeDonations) {
    return { error: "Online donations aren't set up yet — please email bhutancanberra@gmail.com." };
  }

  const dollars = Number(String(formData.get("amount") ?? "").replace(/[$,\s]/g, ""));
  const amountCents = Math.round(dollars * 100);
  if (!Number.isFinite(amountCents) || amountCents < MIN_DONATION_CENTS) {
    return { error: "Please enter an amount of at least $2." };
  }
  if (amountCents > MAX_DONATION_CENTS) {
    return {
      error: "For gifts over $10,000 please email bhutancanberra@gmail.com for bank transfer details.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4321";

  let url: string | null;
  try {
    const session = await stripeDonations.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: { name: "Donation to ABAC" },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/donate?canceled=1`,
    });
    url = session.url;
  } catch (err) {
    console.error("donation checkout failed:", err);
    url = null;
  }

  if (!url) {
    return { error: "Couldn't start checkout — please try again." };
  }
  redirect(url);
}
