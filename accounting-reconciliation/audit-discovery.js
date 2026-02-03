/**
 * AUDIT & DISCREPANCY DETECTION
 * 
 * Production systems require automated flagging of stuck transactions.
 */

const { loadLedger } = require('./ledger');

async function detectDiscrepancies() {
    const ledger = loadLedger();
    const now = new Date();

    const issues = ledger.filter(tx => {
        const txDate = new Date(tx.timestamp);
        const ageInMinutes = (now - txDate) / (1000 * 60);

        // Flag if a Stripe payment exists but Circle payout hasn't finalized after 30 mins
        return tx.status === 'pending_settlement' && ageInMinutes > 30;
    });

    if (issues.length > 0) {
        console.warn(`[AUDIT] ⚠️ Found ${issues.length} potential discrepancies!`);
        issues.forEach(issue => {
            console.warn(`[AUDIT] Stripe ID ${issue.stripeId} is stuck in pending.`);
        });
    } else {
        console.log('[AUDIT] ✅ All systems reconciled. No discrepancies found.');
    }

    return issues;
}

module.exports = { detectDiscrepancies };
