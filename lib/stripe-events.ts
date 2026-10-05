import type Stripe from "stripe";

/** True only when a checkout event means the customer's money has actually
 *  been received. `checkout.session.completed` alone doesn't: for a delayed
 *  payment method (bank debit, e.g. BECS), Stripe sends it as soon as the
 *  customer submits — with payment_status "unpaid" — and the bank can still
 *  reject the payment days later. Activating on that event would hand out a
 *  membership that never gets paid for. The settled signal for those is
 *  `checkout.session.async_payment_succeeded`, which carries "paid".
 *
 *  Cards and wallets are paid at the moment of completion, so for them this
 *  is the same event as before — nothing changes. */
export function isPaidCheckoutEvent(
  event: Stripe.Event
): event is Stripe.CheckoutSessionCompletedEvent | Stripe.CheckoutSessionAsyncPaymentSucceededEvent {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return false;
  }
  return event.data.object.payment_status === "paid";
}
