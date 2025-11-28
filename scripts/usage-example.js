/**
 * Usage Examples for Vault Interaction Functions
 *
 * This file demonstrates how to use the vault interaction functions
 * in a frontend application (React, Vue, etc.) with ethers.js
 */

const { ethers } = require("ethers");
const {
  approveToken,
  initialDeposit,
  userDeposit,
  withdraw,
  claimMerklReward,
  claimMerklRewardsBatch,
  checkAllowance,
  getTokenBalance,
  getPortfolioSummary,
  getAssetProfit
} = require("./vault-interactions");

// Configuration
const VAULT_ADDRESS = "0xYourVaultAddress"; // Replace with your deployed vault address
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

/**
 * Example 1: Initial Deposit
 */
async function exampleInitialDeposit() {
  // Connect to wallet (in browser, use window.ethereum)
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  // Amount to deposit: 100 USDC (USDC has 6 decimals)
  const depositAmount = ethers.parseUnits("100", 6);

  console.log("Step 1: Check token balance");
  const balance = await getTokenBalance(provider, USDC_ADDRESS, userAddress);
  console.log("USDC Balance:", ethers.formatUnits(balance, 6));

  if (balance < depositAmount) {
    throw new Error("Insufficient USDC balance");
  }

  console.log("Step 2: Check allowance");
  const allowance = await checkAllowance(provider, USDC_ADDRESS, userAddress, VAULT_ADDRESS);
  console.log("Current allowance:", ethers.formatUnits(allowance, 6));

  console.log("Step 3: Approve tokens if needed");
  if (allowance < depositAmount) {
    await approveToken(signer, USDC_ADDRESS, VAULT_ADDRESS, depositAmount);
  }

  console.log("Step 4: Make initial deposit");
  const receipt = await initialDeposit(signer, VAULT_ADDRESS, USDC_ADDRESS, depositAmount);
  console.log("Deposit successful! Tx:", receipt.hash);
}

/**
 * Example 2: User Deposit (subsequent deposits)
 */
async function exampleUserDeposit() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Amount to deposit: 50 USDC
  const depositAmount = ethers.parseUnits("50", 6);

  // Approve and deposit
  await approveToken(signer, USDC_ADDRESS, VAULT_ADDRESS, depositAmount);
  const receipt = await userDeposit(signer, VAULT_ADDRESS, USDC_ADDRESS, depositAmount);

  console.log("Additional deposit successful!", receipt.hash);
}

/**
 * Example 3: Withdraw Funds
 */
async function exampleWithdraw() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Withdraw specific amount of shares (or "0" for full withdrawal)
  const withdrawAmount = ethers.parseUnits("50", 18); // Share amount

  const receipt = await withdraw(signer, VAULT_ADDRESS, USDC_ADDRESS, withdrawAmount);
  console.log("Withdrawal successful!", receipt.hash);
}

/**
 * Example 4: Full Withdrawal
 */
async function exampleFullWithdraw() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Pass "0" to withdraw all funds
  const receipt = await withdraw(signer, VAULT_ADDRESS, USDC_ADDRESS, "0");
  console.log("Full withdrawal successful!", receipt.hash);
}

/**
 * Example 5: Claim Single Merkl Reward
 */
async function exampleClaimSingleReward() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Merkl reward data (fetch from Merkl API)
  const rewardToken = "0xRewardTokenAddress";
  const claimableAmount = "1000000000000000000"; // 1 token (18 decimals)
  const proof = [
    "0xproof1...",
    "0xproof2...",
    "0xproof3..."
  ];

  const receipt = await claimMerklReward(
    signer,
    VAULT_ADDRESS,
    rewardToken,
    claimableAmount,
    proof
  );

  console.log("Reward claimed successfully!", receipt.hash);
}

/**
 * Example 6: Claim Multiple Merkl Rewards in Batch
 */
async function exampleClaimBatchRewards() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Multiple rewards data (fetch from Merkl API)
  const tokens = [
    "0xToken1Address",
    "0xToken2Address"
  ];

  const claimableAmounts = [
    "1000000000000000000", // 1 token
    "2000000000000000000"  // 2 tokens
  ];

  const proofs = [
    [
      "0xproof1_1...",
      "0xproof1_2..."
    ],
    [
      "0xproof2_1...",
      "0xproof2_2..."
    ]
  ];

  const receipt = await claimMerklRewardsBatch(
    signer,
    VAULT_ADDRESS,
    tokens,
    claimableAmounts,
    proofs
  );

  console.log("Batch rewards claimed successfully!", receipt.hash);
}

/**
 * Example 7: View Portfolio Summary
 */
async function exampleGetPortfolio() {
  const provider = new ethers.BrowserProvider(window.ethereum);

  const portfolio = await getPortfolioSummary(provider, VAULT_ADDRESS);

  console.log("Portfolio Summary:");
  for (let i = 0; i < portfolio.assets.length; i++) {
    console.log(`Asset: ${portfolio.assets[i]}`);
    console.log(`  Deposited: ${portfolio.deposited[i]}`);
    console.log(`  Current Value: ${portfolio.currentValues[i]}`);
    console.log(`  Profit/Loss: ${portfolio.profits[i]}`);
  }
}

/**
 * Example 8: Check Profit for Specific Asset
 */
async function exampleGetProfit() {
  const provider = new ethers.BrowserProvider(window.ethereum);

  const profit = await getAssetProfit(provider, VAULT_ADDRESS, USDC_ADDRESS);

  if (profit > 0n) {
    console.log("Profit:", ethers.formatUnits(profit, 6), "USDC");
  } else if (profit < 0n) {
    console.log("Loss:", ethers.formatUnits(-profit, 6), "USDC");
  } else {
    console.log("No profit or loss");
  }
}

/**
 * React Component Example
 */
/*
import { useState } from 'react';
import { ethers } from 'ethers';
import { approveToken, userDeposit } from './vault-interactions';

function DepositForm() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const depositAmount = ethers.parseUnits(amount, 6);

      // Approve
      await approveToken(signer, USDC_ADDRESS, VAULT_ADDRESS, depositAmount);

      // Deposit
      const receipt = await userDeposit(signer, VAULT_ADDRESS, USDC_ADDRESS, depositAmount);

      alert('Deposit successful! Tx: ' + receipt.hash);
    } catch (error) {
      console.error(error);
      alert('Deposit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <button onClick={handleDeposit} disabled={loading}>
        {loading ? 'Processing...' : 'Deposit'}
      </button>
    </div>
  );
}
*/

// Export examples
module.exports = {
  exampleInitialDeposit,
  exampleUserDeposit,
  exampleWithdraw,
  exampleFullWithdraw,
  exampleClaimSingleReward,
  exampleClaimBatchRewards,
  exampleGetPortfolio,
  exampleGetProfit
};
