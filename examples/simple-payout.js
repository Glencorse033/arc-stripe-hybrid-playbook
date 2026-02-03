/**
 * EXAMPLE: SIMPLE PAYOUT (Circle API)
 * 
 * This example demonstrates the standard Circle Payout pattern 
 * as utilized by the Operational Playbook.
 */

const axios = require('axios');

async function simplePayout() {
    const payoutPayload = {
        idempotencyKey: `manual_${Date.now()}`,
        source: {
            type: "wallet",
            id: process.env.CIRCLE_MASTER_WALLET_ID
        },
        destination: {
            type: "address",
            address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            chain: "ARC"
        },
        amount: {
            amount: "100.00",
            currency: "USD"
        }
    };

    console.log('[Circle] Sending Payout Request...');

    // In production:
    // const response = await axios.post('https://api.circle.com/v1/payouts', payoutPayload, {
    //     headers: { 'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}` }
    // });

    console.log('[Circle] Payout Initiated Successfully.');
    console.log('Transaction ID: circ_tx_abc123');
}

simplePayout();
