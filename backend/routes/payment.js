const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /create-payment-intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body; // 💵 amount in cents (e.g., $10 = 1000)

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
