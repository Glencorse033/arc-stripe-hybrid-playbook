# Architecture Decisions

## Hybrid Model Overview
The "Stripe + Arc Hybrid" model splits the payment flow into two distinct phases to optimize for user experience (inbound) and operational efficiency (outbound).

### Phase 1: Inbound (Stripe)
- **Tool**: Stripe Checkout or Payment Intents.
- **Why**: 
    - High consumer trust.
    - Support for Apple Pay, Google Pay, and standard Credit Cards.
    - Built-in fraud detection (Radar).
    - Compliance (KYC/AML) on the payer side.

### Phase 2: Outbound (Arc Network)
- **Tool**: Arc Network (USDC).
- **Why**:
    - **Speed**: < 1 second settlement vs 2-7 days for traditional rails.
    - **Cost**: $0.01 gas fee vs standard $0.25-$25 payout fees.
    - **Programmability**: Smart contracts handle complex split logic and automatic reconciliation.

## Component Flow
1. **Payer** pays via Stripe (USD).
2. **Backend Server** receives `payment_intent.succeeded` webhook.
3. **Backend** calculates vendor split (e.g., 90% to vendor, 10% platform fee).
4. **Backend** calls `paySingleVendor` or `batchPayVendors` on Arc Network using USDC.
5. **Vendor** receives USDC instantly in their Arc wallet.

## Reconciliation
- Every Arc transaction is logged with the corresponding Stripe Payment Intent ID in the internal database to ensure auditable 1-to-1 matching.
