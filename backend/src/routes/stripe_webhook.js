"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = require("stripe");
const env_1 = require("../config/env");
const Order_1 = require("../models/Order");
const router = (0, express_1.Router)();
// Production-ready Stripe webhook with signature verification
router.post('/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    var _a;
    try {
        const sig = req.headers['stripe-signature'];
        if (!sig)
            return res.status(400).send('Missing signature');
        const stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY || 'sk_test_dummy', { apiVersion: '2024-06-20' });
        const candidateSecrets = String(env_1.env.STRIPE_WEBHOOK_SECRET || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        if (candidateSecrets.length === 0)
            return res.status(500).send('Webhook secret not configured');
        let event = null;
        for (const secret of candidateSecrets) {
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, secret);
                break;
            }
            catch (_e) {
                // try next secret
            }
        }
        if (!event)
            return res.status(400).send('Invalid signature');
        const type = event.type;
        const obj = (event.data && event.data.object) || {};
        if (type === 'payment_intent.succeeded') {
            const orderId = (_a = obj === null || obj === void 0 ? void 0 : obj.metadata) === null || _a === void 0 ? void 0 : _a.orderId;
            if (orderId) {
                await Order_1.Order.findByIdAndUpdate(orderId, {
                    $set: {
                        status: 'paid',
                        'payment.paidAt': new Date(),
                        'payment.reference': (obj === null || obj === void 0 ? void 0 : obj.id) || (obj === null || obj === void 0 ? void 0 : obj.payment_intent) || 'pi',
                    },
                });
            }
        }
        // TODO: handle other events as needed: checkout.session.completed, payment_intent.payment_failed, etc.
        res.json({ received: true });
    }
    catch (e) {
        console.error('Stripe webhook error', e);
        res.status(400).json({ error: 'invalid' });
    }
});
exports.default = router;
//# sourceMappingURL=stripe_webhook.js.map