import "server-only";
import Stripe from "stripe";

/** Server-only Stripe client. The `server-only` import makes this file fail
 *  to build if anything ever imports it from a "use client" component —
 *  STRIPE_SECRET_KEY must never reach the browser. */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
