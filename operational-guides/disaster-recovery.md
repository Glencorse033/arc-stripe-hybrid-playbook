# Disaster Recovery & Operational Resiliency

What happens when the "glue" fails? This guide covers the scenarios Circle doesn't document.

## Scenario A: Circle API Downtime
*You've captured $1M in Stripe funds, but the Circle payout API is unresponsive.*
1. **Immediate Action**: The `webhook-handler.js` will log a "failed" status in the `ledger.json`. 
2. **Buffer Strategy**: Funds remain in your Stripe account or your platform bank account.
3. **Recovery**: Run the `batch-payroll-with-retry.js` script once Circle services are restored. The `idempotencyKey` (based on Stripe ID) ensures no vendor is paid twice.

## Scenario B: Webhook "Miss"
*Stripe sends a webhook, but your server is down.*
1. **Stripe Retry**: Stripe will retry webhooks for up to 3 days.
2. **Reconciliation Audit**: Run `audit-discovery.js` daily. It will identify any `PaymentIntent` in Stripe that does not have a matching entry in the `ledger.json`.

## Scenario C: Arc Network Congestion
*Though rare due to Arc's architectural efficiency, local spikes can occur.*
1. **View Keys**: Use Arc view keys to monitor the "mempool" equivalent.
2. **Manual Intervention**: The `payout-manager` supports gas-acceleration for critical payroll if needed.

## Scenario D: Wallet Compromise
1. **Circuit Breaker**: Maintain a "Master Pause" capability in your platform logic to stop all outgoing webhooks to Circle.
2. **Liquidity Guard**: Set daily spending limits within the Circle Programmable Wallets dashboard.
