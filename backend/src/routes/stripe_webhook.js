"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../config/env");
const Order_1 = require("../models/Order");
const router = (0, express_1.Router)();
// Production-ready Stripe webhook with signature verification
router.post('/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
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
            const orderId = obj?.metadata?.orderId;
            if (orderId) {
                await Order_1.Order.findByIdAndUpdate(orderId, {
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
    }
    catch (e) {
        console.error('Stripe webhook error', e);
        res.status(400).json({ error: 'invalid' });
    }
});
exports.default = router;
//# sourceMappingURL=stripe_webhook.js.map