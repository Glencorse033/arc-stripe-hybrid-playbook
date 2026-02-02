import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { ArcPayoutEngine } from './arc-payout-engine.js';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const arcEngine = new ArcPayoutEngine();

/**
 * Stripe Webhook Handler
 * Listens for successful payments and triggers outbound Arc payouts.
 */
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error(`[Stripe] Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`[Stripe] PaymentIntent for ${paymentIntent.amount} ${paymentIntent.currency} was successful.`);

        // Logic: Pay vendor 90% of the payment amount
        // Note: Stripe amounts are in cents
        const totalAmountUSD = paymentIntent.amount / 100;
        const vendorAmountUSD = totalAmountUSD * 0.9;

        // In a real app, you'd look up the vendor's Arc wallet address from your database
        // For this playbook, we'll use a placeholder or metadata if provided
        const vendorWallet = paymentIntent.metadata.vendor_wallet || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

        console.log(`[Hybrid] Triggering instant settlement on Arc for vendor ${vendorWallet}`);

        const result = await arcEngine.payVendor(vendorWallet, vendorAmountUSD);

        if (result.success) {
            console.log(`[Hybrid] Settlement complete! Arc Tx: ${result.txHash}`);
        } else {
            console.error(`[Hybrid] Settlement failed: ${result.error}`);
            // In production, you'd queue this for retry or manual intervention
        }
    }

    res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Server] Hybrid Settlement Backend running on port ${PORT}`);
    console.log(`[Server] Webhook endpoint: http://localhost:${PORT}/webhooks/stripe`);
});
