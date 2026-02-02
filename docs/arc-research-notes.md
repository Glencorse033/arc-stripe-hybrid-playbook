# Arc Network Research Notes

## Core Capabilities
- **USDC as Native Gas**: Arc uses USDC for gas fees, ensuring predictable dollar-denominated costs.
- **Performance**: High throughput with ~1 second finality ("1 cent, 1 second, 1 click").
- **Privacy Features**: Arc supports privacy-preserving transactions (Zero-Knowledge proofs).

## Fee Structure
- **Target Cost**: ~$0.01 per transaction.
- **Mechanism**: EWMA-based base fee adjustment (similar to EIP-1559 but smoothed).
- **Testnet Minimum**: 160 Gwei base fee.

## Developer Tools
- **SDKs**: Ethers.js and Viem compatibility.
- **RPC**: Standard Ethereum JSON-RPC.
- **Tokens**: USDC is the primary asset and gas token.

## Testnet Quirks
- Faucets available for testnet USDC.
- Block explorer: ArcScan.
