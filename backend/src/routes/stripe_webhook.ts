import express, { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import { Order } from '../models/Order';

const router = Router();

// Production-ready Stripe webhook with signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) return res.status(400).send('Missing signature');

    const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2024-06-20' } as any);

    const candidateSecrets = String(env.STRIPE_WEBHOOK_SECRET || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (candidateSecrets.length === 0) return res.status(500).send('Webhook secret not configured');

    let event: Stripe.Event | null = null;
    for (const secret of candidateSecrets) {
      try {
        event = stripe.webhooks.constructEvent(req.body as any, sig, secret);
        break;
      } catch (_e) {
        // try next secret
      }
    }
    if (!event) return res.status(400).send('Invalid signature');

    const type = event.type;
    const obj: any = (event.data && (event.data as any).object) || {};

    if (type === 'payment_intent.succeeded') {
      const orderId = obj?.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          $set: {
            status: 'paid',
            'payment.paidAt': new Date(),
            'payment.reference': obj?.id || obj?.payment_intent || 'pi',
          },
        });
      }
    }
    // TODO: handle other events as needed: checkout.session.completed, payment_intent.payment_failed, etc.

    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error', e);
    res.status(400).json({ error: 'invalid' });
  }
});

export default router;
