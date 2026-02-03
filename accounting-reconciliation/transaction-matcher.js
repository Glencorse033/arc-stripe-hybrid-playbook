/**
 * Transaction Matcher
 * 
 * THE PROBLEM THIS SOLVES:
 * Finance teams need to reconcile Stripe payments with Circle payouts
 * Stripe: Customer paid $1000
 * Circle: Vendor received $900
 * Where's the $100? (Platform fee)
 * 
 * This module matches transactions across both systems
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const CirclePayoutClient = require('../integration-patterns/circle-payout-client');

class TransactionMatcher {
    constructor() {
        this.circleClient = new CirclePayoutClient();
    }

    /**
     * Fetch all transactions from yesterday (for daily reconciliation)
     */
    async fetchDailyTransactions(date = null) {
        const targetDate = date || new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        console.log(`📊 Fetching transactions for ${startOfDay.toDateString()}...`);

        // Fetch Stripe payments
        const stripePayments = await stripe.paymentIntents.list({
            created: {
                gte: Math.floor(startOfDay.getTime() / 1000),
                lte: Math.floor(endOfDay.getTime() / 1000)
            },
            limit: 100
        });

        // Fetch Circle payouts
        const circlePayouts = await this.circleClient.listPayouts({
            from: startOfDay.toISOString(),
            to: endOfDay.toISOString()
        });

        console.log(`   Stripe payments: ${stripePayments.data.length}`);
        console.log(`   Circle payouts: ${circlePayouts.length}`);

        return {
            stripePayments: stripePayments.data,
            circlePayouts: circlePayouts
        };
    }

    /**
     * Match Stripe payments to Circle payouts
     * Returns matched, unmatched Stripe, unmatched Circle
     */
    async matchTransactions(transactions) {
        const { stripePayments, circlePayouts } = transactions;

        const matched = [];
        const unmatchedStripe = [];
        const unmatchedCircle = [...circlePayouts];

        for (const payment of stripePayments) {
            const vendorAddress = payment.metadata?.vendor_wallet_address;

            if (!vendorAddress) {
                // No vendor payout expected (direct sale, etc.)
                continue;
            }

            // Find matching Circle payout
            const matchingPayoutIndex = unmatchedCircle.findIndex(payout =>
                payout.destination?.address === vendorAddress &&
                this.amountsMatch(payment.amount / 100, parseFloat(payout.amount.amount))
            );

            if (matchingPayoutIndex !== -1) {
                const payout = unmatchedCircle.splice(matchingPayoutIndex, 1)[0];

                matched.push({
                    stripePaymentId: payment.id,
                    circlePayoutId: payout.id,
                    stripeAmount: payment.amount / 100,
                    circleAmount: parseFloat(payout.amount.amount),
                    vendorAddress: vendorAddress,
                    platformFee: (payment.amount / 100) - parseFloat(payout.amount.amount),
                    timestamp: new Date(payment.created * 1000).toISOString()
                });
            } else {
                unmatchedStripe.push({
                    paymentId: payment.id,
                    amount: payment.amount / 100,
                    vendorAddress: vendorAddress,
                    reason: 'No matching Circle payout found'
                });
            }
        }

        return {
            matched,
            unmatchedStripe,
            unmatchedCircle: unmatchedCircle.map(p => ({
                payoutId: p.id,
                amount: parseFloat(p.amount.amount),
                destination: p.destination?.address,
                reason: 'No matching Stripe payment found'
            }))
        };
    }

    /**
     * Check if amounts match (allowing for small rounding differences)
     */
    amountsMatch(amount1, amount2, tolerance = 0.01) {
        return Math.abs(amount1 - amount2) <= tolerance;
    }

    /**
     * Generate reconciliation report
     */
    generateReport(matchResult) {
        const report = {
            summary: {
                totalMatched: matchResult.matched.length,
                totalUnmatchedStripe: matchResult.unmatchedStripe.length,
                totalUnmatchedCircle: matchResult.unmatchedCircle.length,
                totalStripeRevenue: matchResult.matched.reduce((sum, m) => sum + m.stripeAmount, 0),
                totalCirclePayouts: matchResult.matched.reduce((sum, m) => sum + m.circleAmount, 0),
                totalPlatformFees: matchResult.matched.reduce((sum, m) => sum + m.platformFee, 0)
            },
            matched: matchResult.matched,
            discrepancies: {
                unmatchedStripe: matchResult.unmatchedStripe,
                unmatchedCircle: matchResult.unmatchedCircle
            },
            generatedAt: new Date().toISOString()
        };

        return report;
    }
}

module.exports = TransactionMatcher;
