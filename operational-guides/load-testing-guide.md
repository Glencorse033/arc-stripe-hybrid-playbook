# Load Testing & Scalability Guide

Can this architecture scale to processing 100,000 payouts per hour? 

## 1. Bottleneck Analysis
- **Stripe**: Can handle thousands of webhooks/sec.
- **Middleware**: The `webhook-handler.js` is the primary bottleneck. Must be deployed in a load-balanced environment (e.g., AWS Lambda or Kubernetes).
- **Arc Network**: Designed for high throughput, but the bottleneck is often the **transaction signing latency**.

## 2. Scaling Patterns
- **Batching**: Instead of 1 webhook = 1 Arc Payout, use a worker to group webhooks into batches of 100 every 30 seconds. This utilizes Arc's `batchPay` efficiency.
- **Queueing**: Use Redis or SQS to buffer webhooks. This prevents your server from crashing during a 10x traffic spike (e.g., Black Friday).

## 3. Testing Your Implementation
1. **Dry Run**: Use Stripe's `Test Mode` to trigger 500 simultaneous webhooks.
2. **Ledger Stress**: Verify that the `ledger.json` (or your chosen database) doesn't experience lock-contention during high-frequency writes.
3. **Circle Rate Limits**: Ensure you are aware of your Circle API tier limits (requests per second).
