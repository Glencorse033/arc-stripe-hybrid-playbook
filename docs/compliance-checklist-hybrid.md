# Hybrid Compliance Checklist

Operating a system that bridges the USD banking rail (Stripe) and the USDC digital rail (Arc) introduced unique regulatory and tax requirements.

## 1. Tax Reporting (The "1099" Challenge)
- [ ] **Dual Reporting**: You must reconcile Stripe's 1099-K (total funds captured) against your own records of vendor distributions (USDC).
- [ ] **Cost Basis Tracking**: Ensure your ledger records the USD value of USDC at the exact moment of payout to satisfy IRS capital gains/loss requirements.

## 2. AML/KYC Scoping
- [ ] **Stripe Scope**: Stripe handles KYC for the *payer* (your customer).
- [ ] **Circle/Arc Scope**: You (the platform) are responsible for the *payee* (your vendor). Ensure every vendor wallet address is "travel rule" compliant before initiating Arc payouts.

## 3. Money Transmitter Licensing (MTL)
- [ ] Verify if your jurisdiction classifies the automatic conversion of Stripe-captured USD to Arc-settled USDC as a "money transmission" activity. 
- [ ] Note: Using a "Bank-to-Wallet" partner or Circle's regulated infrastructure often reduces total MTL burden.

## 4. Terms of Service Clarity
- [ ] Update Vendor agreements to specify that settlement occurs in USDC on the Arc Network.
- [ ] Define the "Point of Finality": At what moment is the debt legally satisfied? (Recommended: Arc Transaction Finalization).
