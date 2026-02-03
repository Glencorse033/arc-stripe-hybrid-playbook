/**
 * Stripe Webhook Handler
 * 
 * THIS IS THE CORE VALUE OF THE PLAYBOOK:
 * Connecting Stripe payment events → Circle payouts
 * 
 * Circle doesn't provide this integration.
 * Stripe doesn't provide this integration.
 * YOU are the glue.
 */

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const CirclePayoutClient = require('./circle-payout-client');

const app = express();
const circleClient = new CirclePayoutClient();

// Database (in production, use PostgreSQL/MongoDB)
// For now, simple in-memory tracking
const paymentToPayoutMap = new Map();

/**
 * Stripe webhook endpoint
 * Listens for payment events and triggers Circle payouts
 */
app.post('/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('⚠️ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await handlePaymentSuccess(event.data.object);
                    break;

                case 'charge.refunded':
                    await handleRefund(event.data.object);
                    break;

                case 'payout.paid':
                    // Stripe payout to your bank completed
                    // (Different from Circle payout to vendors)
                    console.log('💰 Stripe payout to bank completed:', event.data.object.id);
                    break;

                default:
                    console.log(`ℹ️ Unhandled event type: ${event.type}`);
            }

            res.json({ received: true });

        } catch (error) {
            console.error('❌ Error processing webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * Handle successful payment from customer
 * 
 * THIS IS WHERE THE MAGIC HAPPENS:
 * Customer paid via Stripe → trigger Circle payout to vendor
 */
async function handlePaymentSuccess(paymentIntent) {
    console.log('\n💳 Payment succeeded:', paymentIntent.id);
    console.log('   Amount:', paymentIntent.amount / 100, 'USD');

    // Extract vendor info from payment metadata
    // (You'd set this when creating the payment intent)
    const vendorAddress = paymentIntent.metadata?.vendor_wallet_address;
    const vendorPayoutPercentage = parseFloat(paymentIntent.metadata?.vendor_payout_percentage || '0.90');

    if (!vendorAddress) {
        console.log('⚠️ No vendor address in metadata, skipping payout');
        return;
    }

    // Calculate vendor payout (e.g., 90% of payment goes to vendor)
    const totalAmount = paymentIntent.amount / 100; // Convert cents to dollars
    const platformFee = totalAmount * (1 - vendorPayoutPercentage);
    const vendorPayout = totalAmount * vendorPayoutPercentage;

    console.log('   Platform fee:', platformFee.toFixed(2), 'USD');
    console.log('   Vendor payout:', vendorPayout.toFixed(2), 'USD');

    try {
        // THIS IS THE INTEGRATION GAP WE'RE FILLING:
        // Trigger Circle payout when Stripe payment succeeds
        const payout = await circleClient.createPayout(
            vendorAddress,
            vendorPayout,
            'ARB' // Use Arbitrum for low fees, or 'ETH' for Arc when mainnet launches
        );

        // Track the relationship for reconciliation
        paymentToPayoutMap.set(paymentIntent.id, {
            stripePaymentId: paymentIntent.id,
            circlePayoutId: payout.id,
            amount: vendorPayout,
            vendorAddress: vendorAddress,
            createdAt: new Date().toISOString(),
            status: 'pending'
        });

        console.log('✅ Circle payout initiated:', payout.id);

        // In production: Save to database, send notification to vendor, etc.
        // await db.payments.create({ stripeId: paymentIntent.id, circleId: payout.id });
        // await sendVendorNotification(vendorAddress, vendorPayout);

    } catch (error) {
        console.error('❌ Failed to create Circle payout:', error.message);

        // CRITICAL: Implement retry logic in production
        // await retryQueue.add({ paymentIntent, vendorAddress, vendorPayout });
    }
}

/**
 * Handle refund
 * 
 * IMPORTANT: You need a manual process for this
 * Circle payouts are blockchain transactions (irreversible)
 * Can't automatically reverse like Stripe refunds
 */
async function handleRefund(charge) {
    console.log('\n💸 Refund issued:', charge.id);
    console.log('   Amount refunded:', charge.amount_refunded / 100, 'USD');

    // Check if we already paid out to vendor
    const paymentRecord = Array.from(paymentToPayoutMap.values())
        .find(p => p.stripePaymentId === charge.payment_intent);

    if (paymentRecord) {
        console.log('⚠️ WARNING: Payout already sent to vendor!');
        console.log('   Circle payout ID:', paymentRecord.circlePayoutId);
        console.log('   Vendor address:', paymentRecord.vendorAddress);
        console.log('   Amount:', paymentRecord.amount, 'USD');
        console.log('\n   ACTION REQUIRED:');
        console.log('   1. Contact vendor to return funds');
        console.log('   2. Or deduct from next payout');
        console.log('   3. Or write off as cost of doing business');

        // In production: Flag for manual review
        // await db.flagForReview({ type: 'refund_after_payout', ...paymentRecord });
    } else {
        console.log('✅ No payout sent yet, safe to refund');
    }
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        stats: {
            totalPayments: paymentToPayoutMap.size
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Stripe webhook handler running on port ${PORT}`);
    console.log(`   Webhook URL: http://localhost:${PORT}/webhooks/stripe`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
