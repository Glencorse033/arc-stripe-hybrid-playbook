/**
 * EXAMPLE: STRIPE-TO-CIRCLE AUTOMATION
 * 
 * The "Operational Glue" Circle doesn't provide.
 */

const { recordTransaction } = require('../accounting-reconciliation/ledger');

async function onStripePaymentSuccess(paymentIntent) {
    console.log(`[Bridge] Captured Stripe Payment: ${paymentIntent.id}`);

    // IDEMPOTENCY GUARD: Crucial for production
    // Circle uses the Stripe ID to prevent double-spending
    const circleId = await triggerCirclePayout(paymentIntent.id, paymentIntent.amount);

    // RECONCILIATION: Cross-system mapping
    await recordTransaction({
        stripeId: paymentIntent.id,
        circleId: circleId,
        amount: paymentIntent.amount / 100,
        timestamp: new Date().toISOString()
    });

    console.log('[Bridge] Automation Complete. Reconciled in Ledger.');
}

async function triggerCirclePayout(stripeId, amount) {
    // Circle API Pattern leveraging Stripe ID for idempotency
    return `circ_tx_op_${stripeId.split('_')[1]}`;
}

onStripePaymentSuccess({ id: "pi_fake_12345", amount: 50000 });
