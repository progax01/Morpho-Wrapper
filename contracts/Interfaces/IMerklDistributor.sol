// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Merkl Distributor interface - Based on official Angle Protocol implementation
interface IMerklDistributor {
    // Operator management functions
    function toggleOperator(address user, address operator) external;
    function operators(address user, address operator) external view returns (uint256);
    
    // Main claim function - BATCH ONLY (exactly as implemented in Distributor.sol)
    function claim(
        address[] calldata users,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external;
    
    // View function to get current merkle root
    function getMerkleRoot() external view returns (bytes32);
}