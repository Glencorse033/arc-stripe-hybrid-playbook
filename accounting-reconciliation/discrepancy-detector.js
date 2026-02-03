/**
 * Discrepancy Detector
 * 
 * Monitors the settlement pipeline to find "orphaned" transactions
 * that require manual intervention.
 */

const TransactionMatcher = require('./transaction-matcher');

async function runDiscrepancyCheck() {
    const matcher = new TransactionMatcher();

    try {
        const transactions = await matcher.fetchDailyTransactions();
        const matchResult = await matcher.matchTransactions(transactions);

        if (matchResult.unmatchedStripe.length > 0 || matchResult.unmatchedCircle.length > 0) {
            console.warn(`[AUDIT] ⚠️ Found ${matchResult.unmatchedStripe.length + matchResult.unmatchedCircle.length} discrepancies!`);

            matchResult.unmatchedStripe.forEach(issue => {
                console.warn(`  - Stripe Payment ${issue.paymentId} has no corresponding Circle Payout.`);
            });

            matchResult.unmatchedCircle.forEach(issue => {
                console.warn(`  - Circle Payout ${issue.payoutId} has no corresponding Stripe Payment.`);
            });

            // In production: Send alert to Slack/PagerDuty
            // await alertManager.send('accounting_discrepancy', matchResult);
        } else {
            console.log('[AUDIT] ✅ All systems reconciled. No issues found.');
        }

        return matchResult;

    } catch (error) {
        console.error('[AUDIT] Failed to run discrepancy check:', error.message);
    }
}

module.exports = { runDiscrepancyCheck };
