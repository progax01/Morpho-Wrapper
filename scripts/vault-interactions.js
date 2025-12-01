/**
 * Vault Interaction Functions
 *
 * This file contains all the functions needed to interact with the UserVault_V4 contract.
 * Frontend developers can import these functions to integrate vault functionality.
 *
 * Usage with ethers.js v6:
 * import { ethers } from 'ethers';
 * import { initialDeposit, userDeposit, withdraw, claimMerklReward, claimMerklRewardsBatch } from './vault-interactions';
 */

const { ethers } = require("ethers");

// ABI fragments for the contracts
const VAULT_ABI = [
  "function initialDeposit(address asset, uint256 amount) external",
  "function userDeposit(address asset, uint256 amount) external",
  "function withdraw(address asset, uint256 amount) external",
  "function claimMerklReward(address token, uint256 claimable, bytes32[] calldata proof) external",
  "function claimMerklRewardsBatch(address[] calldata tokens, uint256[] calldata claimables, bytes32[][] calldata proofs) external",
  "function isAllowedAsset(address asset) external view returns (bool)",
  "function assetHasInitialDeposit(address asset) external view returns (bool)",
  "function assetTotalDeposited(address asset) external view returns (uint256)",
  "function getAssetVaultBalance(address asset) external view returns (uint256)",
  "function getAssetVaultAssets(address asset) external view returns (uint256)",
  "function getAssetProfit(address asset) external view returns (int256)",
  "function getPortfolioSummary() external view returns (address[] memory assets, uint256[] memory deposited, uint256[] memory currentValues, int256[] memory profits)",
  "function owner() external view returns (address)",
  "function admin() external view returns (address)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

/**
 * Approve tokens for vault spending
 * @param {object} signer - Ethers signer instance
 * @param {string} tokenAddress - ERC20 token address
 * @param {string} vaultAddress - Vault contract address
 * @param {string} amount - Amount to approve (in token's smallest unit)
 * @returns {object} Transaction receipt
 */
async function approveToken(signer, tokenAddress, vaultAddress, amount) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

  console.log("Approving token...");
  const tx = await tokenContract.approve(vaultAddress, amount);
  console.log("Approval tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Approval confirmed");

  return receipt;
}

/**
 * Check token allowance
 * @param {object} provider - Ethers provider instance
 * @param {string} tokenAddress - ERC20 token address
 * @param {string} ownerAddress - Owner address
 * @param {string} spenderAddress - Spender address (vault)
 * @returns {bigint} Current allowance
 */
async function checkAllowance(provider, tokenAddress, ownerAddress, spenderAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return await tokenContract.allowance(ownerAddress, spenderAddress);
}

/**
 * Get token balance
 * @param {object} provider - Ethers provider instance
 * @param {string} tokenAddress - ERC20 token address
 * @param {string} accountAddress - Account address
 * @returns {bigint} Token balance
 */
async function getTokenBalance(provider, tokenAddress, accountAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return await tokenContract.balanceOf(accountAddress);
}

/**
 * Initial deposit to vault
 * @param {object} signer - Ethers signer instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @param {string} amount - Amount to deposit (in token's smallest unit, e.g., wei)
 * @returns {object} Transaction receipt
 */
async function initialDeposit(signer, vaultAddress, assetAddress, amount) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

  // Check if asset is allowed
  const isAllowed = await vault.isAllowedAsset(assetAddress);
  if (!isAllowed) {
    throw new Error("Asset not allowed in this vault");
  }

  // Check if initial deposit already made
  const hasInitialDeposit = await vault.assetHasInitialDeposit(assetAddress);
  if (hasInitialDeposit) {
    throw new Error("Initial deposit already made for this asset. Use userDeposit instead.");
  }

  console.log("Making initial deposit...");
  const tx = await vault.initialDeposit(assetAddress, amount);
  console.log("Initial deposit tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Initial deposit confirmed in block:", receipt.blockNumber);

  return receipt;
}

/**
 * User deposit to vault (subsequent deposits after initial)
 * @param {object} signer - Ethers signer instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @param {string} amount - Amount to deposit (in token's smallest unit)
 * @returns {object} Transaction receipt
 */
async function userDeposit(signer, vaultAddress, assetAddress, amount) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

  // Check if initial deposit has been made
  const hasInitialDeposit = await vault.assetHasInitialDeposit(assetAddress);
  if (!hasInitialDeposit) {
    throw new Error("Initial deposit not made yet. Use initialDeposit first.");
  }

  console.log("Making user deposit...");
  const tx = await vault.userDeposit(assetAddress, amount);
  console.log("User deposit tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("User deposit confirmed in block:", receipt.blockNumber);

  return receipt;
}

/**
 * Withdraw from vault
 * @param {object} signer - Ethers signer instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @param {string} amount - Amount of shares to withdraw (0 for full withdrawal)
 * @returns {object} Transaction receipt
 */
async function withdraw(signer, vaultAddress, assetAddress, amount = "0") {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

  console.log("Withdrawing from vault...");
  const tx = await vault.withdraw(assetAddress, amount);
  console.log("Withdrawal tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Withdrawal confirmed in block:", receipt.blockNumber);

  return receipt;
}

/**
 * Claim single Merkl reward
 * @param {object} signer - Ethers signer instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} tokenAddress - Reward token address
 * @param {string} claimableAmount - Amount to claim
 * @param {array} proof - Merkle proof (array of bytes32 hashes)
 * @returns {object} Transaction receipt
 */
async function claimMerklReward(signer, vaultAddress, tokenAddress, claimableAmount, proof) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

  console.log("Claiming Merkl reward...");
  const tx = await vault.claimMerklReward(tokenAddress, claimableAmount, proof);
  console.log("Claim tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Claim confirmed in block:", receipt.blockNumber);

  return receipt;
}

/**
 * Claim multiple Merkl rewards in batch
 * @param {object} signer - Ethers signer instance
 * @param {string} vaultAddress - Vault contract address
 * @param {array} tokenAddresses - Array of reward token addresses
 * @param {array} claimableAmounts - Array of amounts to claim
 * @param {array} proofs - Array of Merkle proofs (each proof is an array of bytes32)
 * @returns {object} Transaction receipt
 */
async function claimMerklRewardsBatch(signer, vaultAddress, tokenAddresses, claimableAmounts, proofs) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, signer);

  if (tokenAddresses.length !== claimableAmounts.length || tokenAddresses.length !== proofs.length) {
    throw new Error("Arrays length mismatch");
  }

  console.log("Claiming batch Merkl rewards...");
  const tx = await vault.claimMerklRewardsBatch(tokenAddresses, claimableAmounts, proofs);
  console.log("Batch claim tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Batch claim confirmed in block:", receipt.blockNumber);

  return receipt;
}

/**
 * Get vault portfolio summary
 * @param {object} provider - Ethers provider instance
 * @param {string} vaultAddress - Vault contract address
 * @returns {object} Portfolio summary with assets, deposited amounts, current values, and profits
 */
async function getPortfolioSummary(provider, vaultAddress) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);

  const [assets, deposited, currentValues, profits] = await vault.getPortfolioSummary();

  return {
    assets,
    deposited,
    currentValues,
    profits
  };
}

/**
 * Get asset profit
 * @param {object} provider - Ethers provider instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @returns {bigint} Profit (positive) or loss (negative)
 */
async function getAssetProfit(provider, vaultAddress, assetAddress) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
  return await vault.getAssetProfit(assetAddress);
}

/**
 * Get vault balance for an asset
 * @param {object} provider - Ethers provider instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @returns {bigint} Vault shares balance
 */
async function getAssetVaultBalance(provider, vaultAddress, assetAddress) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
  return await vault.getAssetVaultBalance(assetAddress);
}

/**
 * Get vault assets (underlying tokens) for an asset
 * @param {object} provider - Ethers provider instance
 * @param {string} vaultAddress - Vault contract address
 * @param {string} assetAddress - Asset token address
 * @returns {bigint} Underlying asset amount
 */
async function getAssetVaultAssets(provider, vaultAddress, assetAddress) {
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
  return await vault.getAssetVaultAssets(assetAddress);
}

// Export all functions
module.exports = {
  // Main interaction functions
  approveToken,
  initialDeposit,
  userDeposit,
  withdraw,
  claimMerklReward,
  claimMerklRewardsBatch,

  // Helper functions
  checkAllowance,
  getTokenBalance,
  getPortfolioSummary,
  getAssetProfit,
  getAssetVaultBalance,
  getAssetVaultAssets,

  // ABIs for reference
  VAULT_ABI,
  ERC20_ABI
};
