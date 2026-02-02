import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

/**
 * ArcPayoutEngine
 * Handles interactions with the Arc Network and the VendorPayoutManager contract.
 */
export class ArcPayoutEngine {
    constructor() {
        if (!process.env.ARC_RPC_URL) throw new Error('ARC_RPC_URL not set');
        if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set');
        if (!process.env.PAYOUT_MANAGER_ADDRESS) throw new Error('PAYOUT_MANAGER_ADDRESS not set');

        this.provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
        this.signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.provider);

        // Load ABI (Assumes compiled artifacts exist)
        // For demonstration, we'll use a simplified ABI of the functions we need
        this.abi = [
            "function paySingleVendor(address vendor, uint256 amount) external",
            "function batchPayVendors(address[] calldata _vendors, uint256[] calldata _amounts) external",
            "function getActiveVendors() external view returns (address[] memory)"
        ];

        this.contract = new ethers.Contract(
            process.env.PAYOUT_MANAGER_ADDRESS,
            this.abi,
            this.signer
        );

        // Standard IERC20 ABI for approval
        this.usdcContract = new ethers.Contract(
            process.env.USDC_ADDRESS,
            ["function approve(address spender, uint256 amount) public returns (bool)", "function allowance(address owner, address spender) public view returns (uint256)"],
            this.signer
        );
    }

    /**
     * Ensures the payout manager is approved to spend USDC.
     */
    async ensureApproval(amount) {
        const allowance = await this.usdcContract.allowance(this.signer.address, process.env.PAYOUT_MANAGER_ADDRESS);
        if (allowance < amount) {
            console.log(`[Arc] Increasing allowance for PayoutManager...`);
            const tx = await this.usdcContract.approve(process.env.PAYOUT_MANAGER_ADDRESS, ethers.MaxUint256);
            await tx.wait();
            console.log(`[Arc] Approval confirmed.`);
        }
    }

    /**
     * Pays a single vendor USDC on Arc Network.
     * @param {string} vendorAddress The wallet address of the vendor.
     * @param {number|string} amountUSD The amount in USD (USDC has 6 decimals).
     */
    async payVendor(vendorAddress, amountUSD) {
        console.log(`[Arc] Initiating payout of ${amountUSD} USDC to ${vendorAddress}`);

        try {
            const amountUSDC = ethers.parseUnits(amountUSD.toString(), 6);
            await this.ensureApproval(amountUSDC);

            const tx = await this.contract.paySingleVendor(vendorAddress, amountUSDC);

            console.log(`[Arc] Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();

            console.log(`[Arc] Transaction finalized in block ${receipt.blockNumber}`);
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error(`[Arc] Payout failed:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pays multiple vendors in a single gas-efficient transaction.
     * @param {Array<{address: string, amount: number|string}>} payouts 
     */
    async batchPay(payouts) {
        const addresses = payouts.map(p => p.address);
        const amounts = payouts.map(p => ethers.parseUnits(p.amount.toString(), 6));
        const totalAmount = amounts.reduce((a, b) => a + b, 0n);

        console.log(`[Arc] Initiating batch payout to ${addresses.length} vendors`);

        try {
            await this.ensureApproval(totalAmount);
            const tx = await this.contract.batchPayVendors(addresses, amounts);
            const receipt = await tx.wait();

            return {
                success: true,
                txHash: receipt.hash,
                vendorCount: addresses.length
            };
        } catch (error) {
            console.error(`[Arc] Batch payout failed:`, error);
            return { success: false, error: error.message };
        }
    }
}
