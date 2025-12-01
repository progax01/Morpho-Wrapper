const hre = require("hardhat");

/**
 * Example deployment configuration for multi-vault-per-asset architecture
 *
 * This example shows how to deploy a UserVault that supports:
 * - USDC with 8 different Morpho vaults
 * - WETH with 5 different Morpho vaults
 * - Each asset can have a different number of vaults
 */

async function main() {
  console.log("\n🚀 Multi-Vault Deployment Example\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // ====== EXAMPLE CONFIGURATION ======

  // Assets to support
  const assets = [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    "0x4200000000000000000000000000000000000006", // WETH on Base
  ];

  // Multi-vault configuration per asset (2D array)
  // USDC has 8 vaults, WETH has 5 vaults
  const assetVaults = [
    // USDC Vaults (8 different strategies/vaults)
    [
      "0xUSDC_Vault_1_Conservative", // First vault becomes the active/primary vault
      "0xUSDC_Vault_2_Balanced",
      "0xUSDC_Vault_3_Aggressive",
      "0xUSDC_Vault_4_Stablecoin_Only",
      "0xUSDC_Vault_5_High_Yield",
      "0xUSDC_Vault_6_Low_Risk",
      "0xUSDC_Vault_7_Diversified",
      "0xUSDC_Vault_8_Custom_Strategy",
    ],
    // WETH Vaults (5 different strategies/vaults)
    [
      "0xWETH_Vault_1_Blue_Chip", // First vault becomes the active/primary vault
      "0xWETH_Vault_2_DeFi_Focus",
      "0xWETH_Vault_3_Lending",
      "0xWETH_Vault_4_Liquid_Staking",
      "0xWETH_Vault_5_Mixed_Strategy",
    ],
  ];

  // Flatten all vaults for the whitelist (13 vaults total)
  const initialAllowedVaults = [
    ...assetVaults[0], // All 8 USDC vaults
    ...assetVaults[1], // All 5 WETH vaults
  ];

  console.log("\n📋 Vault Configuration:");
  console.log("  Total Assets:", assets.length);
  console.log("  USDC - Number of vaults:", assetVaults[0].length);
  console.log("  WETH - Number of vaults:", assetVaults[1].length);
  console.log("  Total whitelisted vaults:", initialAllowedVaults.length);

  // ====== DEPLOYMENT PARAMETERS ======

  const deploymentParams = {
    owner: deployer.address,
    admin: deployer.address,
    assets: assets,
    assetVaults: assetVaults, // 2D array!
    initialAllowedVaults: initialAllowedVaults,
    revenueAddress: deployer.address,
    feePercentage: 100, // 1%
    rebalanceFeePercentage: 1000, // 10%
    merklClaimFeePercentage: 1000, // 10%
  };

  // Generate salt
  const nonce = Date.now();
  const salt = hre.ethers.solidityPackedKeccak256(
    ["address", "uint256"],
    [deploymentParams.owner, nonce]
  );

  console.log("\n🔮 Deployment salt:", salt);

  // ====== WHAT HAPPENS DURING DEPLOYMENT ======
  console.log("\n📝 How multi-vault architecture works:");
  console.log("\n1. Initial Setup:");
  console.log("   - USDC active vault: USDC_Vault_1_Conservative");
  console.log("   - WETH active vault: WETH_Vault_1_Blue_Chip");
  console.log("   - All deposits initially go to these active vaults");

  console.log("\n2. Available Operations:");
  console.log("   - Admin can call setAssetActiveVault() to switch USDC to any of its 8 vaults");
  console.log("   - Admin can call setAssetActiveVault() to switch WETH to any of its 5 vaults");
  console.log("   - Admin can call rebalanceToVault() to move funds between vaults");
  console.log("   - Admin can call addVaultToAsset() to add new vaults to an asset");
  console.log("   - Admin can call removeVaultFromAsset() to remove vaults (except active one)");

  console.log("\n3. View Functions:");
  console.log("   - getAssetAvailableVaults(USDC) → returns all 8 USDC vaults");
  console.log("   - getAssetAvailableVaults(WETH) → returns all 5 WETH vaults");
  console.log("   - getAssetActiveVault(USDC) → returns current active USDC vault");
  console.log("   - isVaultAvailableForAsset(USDC, vault) → checks if vault is allowed");

  // ====== EXAMPLE USAGE AFTER DEPLOYMENT ======
  console.log("\n\n💡 Example Usage After Deployment:\n");

  console.log("// Get factory contract");
  console.log('const factory = await ethers.getContractAt("UserVaultFactory", FACTORY_ADDRESS);');
  console.log("");

  console.log("// Deploy vault with multi-vault configuration");
  console.log("const tx = await factory.deployVault(");
  console.log("  owner,");
  console.log("  admin,");
  console.log("  assets,");
  console.log("  assetVaults,  // 2D array: [[USDC vaults], [WETH vaults]]");
  console.log("  initialAllowedVaults,");
  console.log("  revenueAddress,");
  console.log("  feePercentage,");
  console.log("  rebalanceFeePercentage,");
  console.log("  merklClaimFeePercentage,");
  console.log("  salt,");
  console.log("  { value: deploymentFee }");
  console.log(");");
  console.log("");

  console.log("// After deployment, check available vaults for USDC");
  console.log('const vault = await ethers.getContractAt("UserVault_V4", vaultAddress);');
  console.log("const usdcVaults = await vault.getAssetAvailableVaults(USDC_ADDRESS);");
  console.log("console.log('USDC has', usdcVaults.length, 'available vaults');");
  console.log("");

  console.log("// Switch USDC to a different vault (e.g., high yield strategy)");
  console.log("await vault.setAssetActiveVault(");
  console.log("  USDC_ADDRESS,");
  console.log("  '0xUSDC_Vault_5_High_Yield'");
  console.log(");");
  console.log("");

  console.log("// Or use the older function (still works)");
  console.log("await vault.updateAssetVault(");
  console.log("  USDC_ADDRESS,");
  console.log("  '0xUSDC_Vault_3_Aggressive'");
  console.log(");");
  console.log("");

  console.log("// Rebalance USDC from current vault to another available vault");
  console.log("await vault.rebalanceToVault(");
  console.log("  USDC_ADDRESS,");
  console.log("  '0xUSDC_Vault_7_Diversified'  // Must be in available vaults!");
  console.log(");");
  console.log("");

  console.log("// Add a new vault to USDC (e.g., new strategy launched)");
  console.log("await vault.addVaultToAsset(");
  console.log("  USDC_ADDRESS,");
  console.log("  '0xUSDC_Vault_9_New_Strategy'");
  console.log(");");
  console.log("");

  console.log("// Remove a vault from USDC (cannot remove active vault)");
  console.log("await vault.removeVaultFromAsset(");
  console.log("  USDC_ADDRESS,");
  console.log("  '0xUSDC_Vault_8_Custom_Strategy'");
  console.log(");");

  console.log("\n" + "=".repeat(80));
  console.log("🎯 KEY BENEFITS OF MULTI-VAULT ARCHITECTURE:");
  console.log("=".repeat(80));
  console.log(`
1. ✅ Flexibility: Each asset can have different number of vaults
   - USDC: 8 vaults (conservative to aggressive strategies)
   - WETH: 5 vaults (different DeFi strategies)

2. ✅ Easy Switching: Admin can switch between vaults without redeploying
   - Switch to higher APY vault when available
   - Move to safer vault during market volatility
   - Test new strategies without risk

3. ✅ Rebalancing: Move funds between vaults of the same asset
   - Optimize yield across multiple strategies
   - Take profit from high performers
   - Compound returns efficiently

4. ✅ Dynamic Management: Add/remove vaults as ecosystem evolves
   - New Morpho vaults get added over time
   - Deprecated vaults can be removed
   - Always stay up-to-date with best opportunities

5. ✅ Backward Compatible: Existing functions still work
   - updateAssetVault() redirects to setAssetActiveVault()
   - No breaking changes for existing integrations
`);

  console.log("✨ This architecture is production-ready!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
