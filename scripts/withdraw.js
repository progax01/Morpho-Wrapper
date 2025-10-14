// withdraw_all.js
// Usage: node withdraw_all.js
// Env vars required:
//   RPC_URL           -> your JSON-RPC endpoint
//   PRIVATE_KEY       -> the contract owner's private key (must be the owner() of the vault contract)
//   CONTRACT_ADDRESS  -> deployed UserVault_V3 address

import { ethers } from "ethers";

// ---- CONFIG FROM ENV ----
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("Missing RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS in environment.");
  process.exit(1);
}

// ---- MIN ABI (only what we need) ----
// NOTE: functions come from your UserVault_V3 and Pausable
const VAULT_ABI = [
  // views
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function currentVault() view returns (address)",
  "function getCurrentVaultBalance() view returns (uint256)", // shares
  "function getWithdrawFeePreview(uint256 withdrawAmount) view returns (uint256 feeAmount, uint256 userAmount)",
  "function asset() view returns (address)",

  // action
  "function withdraw(address vault, uint256 amount) external",
];

async function main() {
  console.log("== Withdraw ALL from current vault ==");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, VAULT_ABI, wallet);

  // Basic sanity checks
  const [owner, paused] = await Promise.all([contract.owner(), contract.paused()]);
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(
      `Signer is not the owner. Owner: ${owner}, Signer: ${wallet.address}`
    );
  }
  if (paused) {
    throw new Error("Contract is paused. Use emergencyWithdraw if appropriate, or unpause first.");
  }

  const currentVault = await contract.currentVault();
  if (currentVault === ethers.ZeroAddress) {
    throw new Error("No currentVault set on contract.");
  }

  const shareBalance = await contract.getCurrentVaultBalance(); // shares held in current vault
  if (shareBalance === 0n) {
    console.log("No shares in current vault. Nothing to withdraw.");
    return;
  }

  // Optional: show fee preview (function expects 'withdrawAmount' in SHARES)
  const [feePreview, userPreview] = await contract.getWithdrawFeePreview(shareBalance);
  console.log(`Current vault: ${currentVault}`);
  console.log(`Share balance (to redeem): ${shareBalance.toString()}`);
  console.log(`Estimated fee (in primary asset units): ${feePreview.toString()}`);
  console.log(`Estimated net to owner (in primary asset units): ${userPreview.toString()}`);

  // Call withdraw with amount = 0 to withdraw FULL balance
  // (Contract logic: if amount==0 or > vaultBalance => full withdrawal)
  console.log("Sending withdraw transaction...");
  const tx = await contract.withdraw(currentVault, 0n);
  console.log(`Tx submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Withdraw confirmed in block ${receipt.blockNumber}. Status: ${receipt.status ? "Success" : "Failed"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
