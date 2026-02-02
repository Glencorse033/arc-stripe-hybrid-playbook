import { ArcPayoutEngine } from '../backend/arc-payout-engine.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../backend/.env' });

async function runExample() {
    const engine = new ArcPayoutEngine();

    const vendorAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const amount = 100; // $100 USDC

    console.log("--- Basic Payout Example ---");
    const result = await engine.payVendor(vendorAddress, amount);

    if (result.success) {
        console.log("Success!");
        console.log(`Transaction Hash: ${result.txHash}`);
    } else {
        console.error("Failed:", result.error);
    }
}

runExample().catch(console.error);
