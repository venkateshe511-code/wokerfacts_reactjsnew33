const express = require("express");
const Stripe = require("stripe");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Stripe requires the raw body to verify the signature
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).send("Webhook not configured");
    }

    const sig = req.headers["stripe-signature"];
    let event;
    try {
      // event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
       event = getStripe().webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // const obj = event.data && event.data.object ? event.data.object : {};
      const obj = event?.data?.object || {};
      const type = event.type;

      const meta = obj.metadata || {};
      const reportId = meta.reportId || meta.report_id || null;
      const paymentIntentId = obj.payment_intent || obj.id || null;
      const checkoutSessionId =
        type === "checkout.session.completed" ? obj.id : null;

      if (
        (type === "checkout.session.completed" ||
          type === "payment_intent.succeeded") &&
        reportId
      ) {
        // Extract amount and currency from Stripe event
        let amountInCents = obj.amount_total || obj.amount || null;
        let currency = obj.currency || null;

        // Convert cents to dollars
        let amountInDollars = amountInCents ? amountInCents / 100 : null;

        await db
          .collection("reports")
          .doc(String(reportId))
          .set(
            {
              paid: true,
              paymentIntentId: paymentIntentId ? String(paymentIntentId) : null,
              checkoutSessionId: checkoutSessionId
                ? String(checkoutSessionId)
                : null,
              evaluatorId: meta.evaluatorId || meta.evaluator_id || null,
              claimantId: meta.claimantId || meta.claimant_id || null,
              claimantName: meta.claimantName || meta.claimant_name || null,
              amount: amountInDollars,
              currency: currency ? currency.toUpperCase() : null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              source: "stripe-webhook",
            },
            { merge: true },
          );
        console.log(`Report ${reportId} marked as paid. Amount: ${amountInDollars} ${currency}`);
      }

      return res.json({ received: true });
    } catch (e) {
      console.error("Webhook handling error", e);
      return res.status(500).send("Internal webhook error");
    }
  },
);

module.exports = router;