# Stripe Integration Analysis

## Core Usage Patterns
- **Checkout / Payment Intents**: Accepting credit cards and ACH from customers.
- **Webhooks**: Real-time notification of successful payments.
- **Payouts**: Moving funds from Stripe balance to bank accounts (can be replaced by Arc for vendors).

## Cost Structure
- **Card Payments**: 2.9% + $0.30 per transaction.
- **Standard Payouts**: $0.25 per transfer.
- **Instant Payouts**: 1.5% (min $0.50).
- **International**: +1% for currency conversion + potential wire fees.

## Hybrid Benefit
- Use Stripe for **Inbound** (Customer trust, card support).
- Use Arc for **Outbound** (Speed, 99% lower fees for vendors).
