// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VendorPayoutManager
 * @notice Manages vendor USDC payments on Arc Network, integrated with Stripe-sourced funds.
 */
contract VendorPayoutManager is Ownable, ReentrancyGuard {
    
    IERC20 public immutable usdc;
    
    struct Vendor {
        uint256 totalPaid;
        uint256 paymentCount;
        uint256 lastPaymentTime;
        bool isActive;
    }
    
    mapping(address => Vendor) public vendors;
    address[] public vendorList;
    
    event VendorPaid(
        address indexed vendor, 
        uint256 amount, 
        uint256 timestamp
    );
    
    event BatchPaymentComplete(
        uint256 totalAmount, 
        uint256 vendorCount,
        uint256 gasUsed
    );
    
    constructor(address _usdcAddress) Ownable(msg.sender) {
        require(_usdcAddress != address(0), "Invalid USDC address");
        usdc = IERC20(_usdcAddress);
    }
    
    /**
     * @notice Pay single vendor
     * @param vendor Vendor wallet address
     * @param amount USDC amount (6 decimals)
     */
    function paySingleVendor(
        address vendor, 
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(vendor != address(0), "Invalid vendor address");
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDC from owner (backend) to vendor
        require(
            usdc.transferFrom(msg.sender, vendor, amount),
            "USDC transfer failed"
        );
        
        // Update vendor stats
        if (!vendors[vendor].isActive) {
            vendors[vendor].isActive = true;
            vendorList.push(vendor);
        }
        
        vendors[vendor].totalPaid += amount;
        vendors[vendor].paymentCount += 1;
        vendors[vendor].lastPaymentTime = block.timestamp;
        
        emit VendorPaid(vendor, amount, block.timestamp);
    }
    
    /**
     * @notice Batch pay multiple vendors (gas efficient)
     * @param _vendors Array of vendor addresses
     * @param _amounts Array of USDC amounts
     */
    function batchPayVendors(
        address[] calldata _vendors,
        uint256[] calldata _amounts
    ) external onlyOwner nonReentrant {
        require(_vendors.length == _amounts.length, "Array length mismatch");
        require(_vendors.length > 0, "Empty arrays");
        
        uint256 totalAmount = 0;
        uint256 startGas = gasleft();
        
        for (uint256 i = 0; i < _vendors.length; i++) {
            address vendor = _vendors[i];
            uint256 amount = _amounts[i];
            
            require(vendor != address(0), "Invalid vendor");
            require(amount > 0, "Amount must be > 0");
            
            // Transfer USDC
            require(
                usdc.transferFrom(msg.sender, vendor, amount),
                "Transfer failed"
            );
            
            // Update stats
            if (!vendors[vendor].isActive) {
                vendors[vendor].isActive = true;
                vendorList.push(vendor);
            }
            
            vendors[vendor].totalPaid += amount;
            vendors[vendor].paymentCount += 1;
            vendors[vendor].lastPaymentTime = block.timestamp;
            
            totalAmount += amount;
            
            emit VendorPaid(vendor, amount, block.timestamp);
        }
        
        uint256 gasUsed = startGas - gasleft();
        
        emit BatchPaymentComplete(totalAmount, _vendors.length, gasUsed);
    }
    
    /**
     * @notice Get all active vendors
     */
    function getActiveVendors() external view returns (address[] memory) {
        return vendorList;
    }
    
    /**
     * @notice Emergency withdraw (only owner) in case funds are sent here directly
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No balance");
        require(usdc.transfer(owner(), balance), "Withdraw failed");
    }
}
