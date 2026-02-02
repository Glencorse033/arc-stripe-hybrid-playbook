import { ArcPayoutEngine } from '../backend/arc-payout-engine.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../backend/.env' });

async function runBatchExample() {
    const engine = new ArcPayoutEngine();

    const payouts = [
        { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', amount: 50 },
        { address: '0x1234567890123456789012345678901234567890', amount: 75.50 },
        { address: '0x0987654321098765432109876543210987654321', amount: 120 }
    ];

    console.log("--- Batch Payroll Example ---");
    console.log(`Processing payments for ${payouts.length} vendors...`);

    const result = await engine.batchPay(payouts);

    if (result.success) {
        console.log("Batch payout successful!");
        console.log(`Transaction Hash: ${result.txHash}`);
        console.log(`Total Vendors Paid: ${result.vendorCount}`);
        console.log(`Est. Savings vs Stripe standard payout: $${(payouts.length * 0.25 - 0.01).toFixed(2)}`);
    } else {
        console.error("Batch failed:", result.error);
    }
}

runBatchExample().catch(console.error);
