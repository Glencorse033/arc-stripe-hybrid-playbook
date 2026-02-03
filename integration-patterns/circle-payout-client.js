/**
 * Circle Payout API Client
 * Thin wrapper over Circle's official API
 * Docs: https://developers.circle.com/circle-mint/docs/circle-payouts-quickstart
 */

const axios = require('axios');
require('dotenv').config();

const CIRCLE_API_BASE = process.env.CIRCLE_API_BASE || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

class CirclePayoutClient {
    constructor() {
        this.client = axios.create({
            baseURL: CIRCLE_API_BASE,
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Create a single USDC payout to vendor
     * Uses Circle's Payout API (not custom smart contracts)
     * 
     * @param {string} destination - Vendor blockchain address or Circle wallet ID
     * @param {number} amount - Amount in USD (will convert to USDC)
     * @param {string} blockchain - 'ETH', 'MATIC', 'ARB', etc.
     * @returns {Promise<Object>} Payout details
     */
    async createPayout(destination, amount, blockchain = 'ARB') { // Default to Arbitrum for low fees
        try {
            const response = await this.client.post('/v1/payouts', {
                idempotencyKey: this.generateIdempotencyKey(),
                destination: {
                    type: 'blockchain',
                    address: destination,
                    chain: blockchain
                },
                amount: {
                    amount: amount.toFixed(2),
                    currency: 'USD'
                },
                metadata: {
                    source: 'stripe-hybrid-integration',
                    timestamp: new Date().toISOString()
                }
            });

            console.log('✅ Circle payout created:', response.data.id);
            return response.data;

        } catch (error) {
            console.error('❌ Circle payout failed:', error.response?.data || error.message);
            throw new Error(`Circle payout failed: ${error.message}`);
        }
    }

    /**
     * Create batch payouts (more efficient for multiple vendors)
     * 
     * @param {Array} payouts - Array of {destination, amount, blockchain}
     * @returns {Promise<Array>} Array of payout results
     */
    async createBatchPayouts(payouts) {
        console.log(`📦 Processing batch of ${payouts.length} payouts...`);

        // Circle doesn't have native batch API, so we process sequentially
        // with rate limiting to avoid API throttling
        const results = [];

        for (const payout of payouts) {
            try {
                const result = await this.createPayout(
                    payout.destination,
                    payout.amount,
                    payout.blockchain || 'ARB'
                );
                results.push({ success: true, data: result });

                // Rate limiting: 10 requests/second max
                await this.sleep(100);

            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    payout: payout
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Batch complete: ${successCount}/${payouts.length} successful`);

        return results;
    }

    /**
     * Get payout status
     * 
     * @param {string} payoutId - Circle payout ID
     * @returns {Promise<Object>} Payout status
     */
    async getPayoutStatus(payoutId) {
        try {
            const response = await this.client.get(`/v1/payouts/${payoutId}`);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get payout status: ${error.message}`);
        }
    }

    /**
     * List recent payouts (for reconciliation)
     * 
     * @param {Object} options - Filter options (from, to, pageSize)
     * @returns {Promise<Array>} List of payouts
     */
    async listPayouts(options = {}) {
        try {
            const response = await this.client.get('/v1/payouts', {
                params: {
                    from: options.from || this.getYesterdayISO(),
                    to: options.to || new Date().toISOString(),
                    pageSize: options.pageSize || 50
                }
            });

            return response.data.data || [];
        } catch (error) {
            throw new Error(`Failed to list payouts: ${error.message}`);
        }
    }

    // Helper methods
    generateIdempotencyKey() {
        return `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getYesterdayISO() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString();
    }
}

module.exports = CirclePayoutClient;
