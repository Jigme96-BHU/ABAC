import "server-only";
import Stripe from "stripe";

/** Server-only Stripe client. The `server-only` import makes this file fail
 *  to build if anything ever imports it from a "use client" component —
 *  STRIPE_SECRET_KEY must never reach the browser. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Donations go through a separate Stripe account so they pay out to a
 *  different bank account from memberships. Null until the key is set, so
 *  the donate page can fall back to "email us" instead of crashing. */
export const stripeDonations = process.env.STRIPE_DONATIONS_SECRET_KEY
  ? new Stripe(process.env.STRIPE_DONATIONS_SECRET_KEY)
  : null;
