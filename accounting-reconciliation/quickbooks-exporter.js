/**
 * QuickBooks Exporter
 * 
 * THE PROBLEM THIS SOLVES:
 * Finance teams use QuickBooks/Xero for accounting.
 * They need to reconcile Stripe + Circle transactions to accounting software.
 * 
 * This module generates properly formatted journal entries that map the 
 * movement of funds between the fiat banking rail and the digital USDC rail.
 */

const fs = require('fs');
const path = require('path');

class QuickBooksExporter {
    /**
     * Generates a Journal Entry structure for QuickBooks
     * This bridges the gap between Stripe captures and Circle payouts.
     * 
     * @param {Object} matchedTx - A matched transaction from the Matcher
     */
    generateJournalEntry(matchedTx) {
        return {
            date: matchedTx.timestamp,
            memo: `Hybrid Settlement: Stripe ${matchedTx.stripePaymentId} | Circle ${matchedTx.circlePayoutId}`,
            lines: [
                {
                    account: "Stripe Clearing",
                    type: "Debit",
                    amount: matchedTx.stripeAmount,
                    description: "Customer funds captured"
                },
                {
                    account: "USDC Wallet (Circle)",
                    type: "Credit",
                    amount: matchedTx.circleAmount,
                    description: "Vendor payout settled"
                },
                {
                    account: "Service Revenue (Fees)",
                    type: "Credit",
                    amount: matchedTx.platformFee,
                    description: "Platform transaction fee"
                }
            ]
        };
    }

    /**
     * Export matched transactions to CSV for manual import
     */
    exportToCSV(matchedTransactions, outputPath = './reconciliation-report.csv') {
        const headers = ['Date', 'Stripe ID', 'Circle ID', 'Stripe Amount', 'Vendor Payout', 'Platform Fee', 'Vendor Address'];
        const rows = matchedTransactions.map(t => [
            t.timestamp,
            t.stripePaymentId,
            t.circlePayoutId,
            t.stripeAmount.toFixed(2),
            t.circleAmount.toFixed(2),
            t.platformFee.toFixed(2),
            t.vendorAddress
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const absolutePath = path.resolve(outputPath);
        fs.writeFileSync(absolutePath, csvContent);
        console.log(`✅ QuickBooks CSV export complete: ${absolutePath}`);
        return absolutePath;
    }

    /**
     * Mock push to QuickBooks API
     */
    async pushToQuickBooks(matchedTransactions) {
        console.log(`📤 Pushing ${matchedTransactions.length} journal entries to QuickBooks API...`);
        // Example: matchedTransactions.forEach(tx => qb.createJournalEntry(this.generateJournalEntry(tx)));
        console.log('✅ QuickBooks sync complete.');
    }
}

module.exports = QuickBooksExporter;
