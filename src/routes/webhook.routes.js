const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/payment.model');
const Appointment = require('../models/appointment.model');
const asyncHandler = require('../middlewares/async');

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({type: 'application/json'}), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!');
      break;
    
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer!');
      break;
    
    case 'charge.succeeded':
      const charge = event.data.object;
      // Update payment status in database
      await Payment.findOneAndUpdate(
        { gatewayTransactionId: charge.id },
        { status: 'Completed' }
      );
      break;
    
    case 'charge.failed':
      const failedCharge = event.data.object;
      // Update payment status in database
      await Payment.findOneAndUpdate(
        { gatewayTransactionId: failedCharge.id },
        { status: 'Failed' }
      );
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
}));

module.exports = router;