/**
 * Error Handling Patterns for Stripe + Circle Integration
 * 
 * CRITICAL FOR PRODUCTION:
 * Both Stripe and Circle APIs can fail. You need robust error handling.
 */

const CirclePayoutClient = require('./circle-payout-client');

class PayoutRetryQueue {
    constructor() {
        this.queue = [];
        this.maxRetries = 3;
        this.retryDelayMs = 60000; // 1 minute
    }

    /**
     * Add failed payout to retry queue
     */
    async add(payoutData) {
        this.queue.push({
            ...payoutData,
            retryCount: 0,
            firstAttempt: new Date().toISOString(),
            nextRetry: new Date(Date.now() + this.retryDelayMs).toISOString()
        });

        console.log(`📥 Added to retry queue: ${this.queue.length} items pending`);
    }

    /**
     * Process retry queue (run this on a cron job)
     */
    async processQueue() {
        const circleClient = new CirclePayoutClient();
        const now = Date.now();

        for (let i = this.queue.length - 1; i >= 0; i--) {
            const item = this.queue[i];

            // Check if it's time to retry
            if (new Date(item.nextRetry).getTime() > now) {
                continue; // Not yet
            }

            console.log(`\n🔄 Retrying payout (attempt ${item.retryCount + 1}/${this.maxRetries})`);

            try {
                const payout = await circleClient.createPayout(
                    item.vendorAddress,
                    item.amount,
                    item.blockchain
                );

                console.log('✅ Retry successful!', payout.id);

                // Remove from queue
                this.queue.splice(i, 1);

                // In production: Update database
                // await db.payouts.update({ stripeId: item.stripePaymentId, status: 'completed' });

            } catch (error) {
                item.retryCount++;

                if (item.retryCount >= this.maxRetries) {
                    console.error(`❌ Max retries exceeded for ${item.stripePaymentId}`);

                    // CRITICAL: Alert operations team
                    await this.alertOps({
                        type: 'payout_failed_permanently',
                        stripePaymentId: item.stripePaymentId,
                        vendorAddress: item.vendorAddress,
                        amount: item.amount,
                        error: error.message
                    });

                    // Remove from queue (give up)
                    this.queue.splice(i, 1);

                } else {
                    // Schedule next retry with exponential backoff
                    const backoffMs = this.retryDelayMs * Math.pow(2, item.retryCount);
                    item.nextRetry = new Date(Date.now() + backoffMs).toISOString();

                    console.log(`⏰ Will retry in ${backoffMs / 1000} seconds`);
                }
            }
        }
    }

    /**
     * Alert operations team (implement via PagerDuty, Slack, email)
     */
    async alertOps(alertData) {
        console.error('\n🚨 CRITICAL ALERT - Operations Team Notified');
        console.error(JSON.stringify(alertData, null, 2));

        // In production:
        // await pagerduty.trigger({ ...alertData });
        // await slack.post('#ops-alerts', `Payout failed: ${alertData.stripePaymentId}`);
        // await sendEmail('ops@company.com', 'URGENT: Payout Failed', alertData);
    }
}

/**
 * Circuit breaker pattern for Circle API
 * Prevents cascading failures if Circle is down
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000; // 1 minute
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failures = 0;
        this.nextAttempt = Date.now();
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN - Circle API may be down');
            }
            // Try half-open
            this.state = 'HALF_OPEN';
        }

        try {
            const result = await fn();

            // Success - reset circuit breaker
            this.failures = 0;
            this.state = 'CLOSED';

            return result;

        } catch (error) {
            this.failures++;

            if (this.failures >= this.failureThreshold) {
                this.state = 'OPEN';
                this.nextAttempt = Date.now() + this.resetTimeout;

                console.error(`🔴 Circuit breaker OPEN - ${this.failures} consecutive failures`);
            }

            throw error;
        }
    }

    getStatus() {
        return {
            state: this.state,
            failures: this.failures,
            nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
        };
    }
}

module.exports = {
    PayoutRetryQueue,
    CircuitBreaker
};
