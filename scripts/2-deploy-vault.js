const hre = require("hardhat");
const { getNetworkConfig } = require("./config");

async function main() {
  console.log("\n🚀 Starting UserVault Deployment via Factory...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying vault with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Get network config
  const networkConfig = await getNetworkConfig(hre.network);

  // Check if factory is deployed
  if (networkConfig.FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Factory address not set in config.js. Please deploy factory first.");
  }

  // Get factory contract
  const factory = await hre.ethers.getContractAt("UserVaultFactory", networkConfig.FACTORY_ADDRESS);
  console.log("Using factory at:", networkConfig.FACTORY_ADDRESS);

  // ====== CONFIGURE YOUR VAULT PARAMETERS HERE ======
  const vaultOwner = deployer.address; // The user who owns the vault
  const vaultAdmin = deployer.address; // The admin who manages the vault (can be different)
  const revenueAddress = deployer.address; // Address to receive fees

  // Multi-asset configuration with MULTIPLE VAULTS PER ASSET
  const assets = [
    networkConfig.USDC,
    // Add more assets as needed
    // networkConfig.WETH,
  ];

  // 2D array: Each asset can have multiple vaults
  // The first vault in each array becomes the active/primary vault
  const assetVaults = [
    // USDC vaults (you can add multiple vaults for USDC)
    [
      networkConfig.USDC_VAULT,
      // Add more USDC vaults here:
      // networkConfig.USDC_VAULT_AGGRESSIVE,
      // networkConfig.USDC_VAULT_CONSERVATIVE,
      // networkConfig.USDC_VAULT_HIGH_YIELD,
    ],
    // WETH vaults (uncomment when you add WETH)
    // [
    //   networkConfig.WETH_VAULT,
    //   networkConfig.WETH_VAULT_2,
    //   networkConfig.WETH_VAULT_3,
    // ],
  ];

  // Flatten all vaults for the whitelist
  const initialAllowedVaults = assetVaults.flat();

  // Fee configuration (in basis points: 100 = 1%)
  const feePercentage = 100; // 1% withdrawal fee
  const rebalanceFeePercentage = 1000; // 10% rebalance fee
  const merklClaimFeePercentage = 1000; // 10% Merkl claim fee

  // Generate unique nonce for this deployment
  const nonce = Date.now(); // Use timestamp as nonce
  const salt = hre.ethers.solidityPackedKeccak256(["address", "uint256"], [vaultOwner, nonce]);

  console.log("\n📋 Vault Configuration:");
  console.log("  Owner:", vaultOwner);
  console.log("  Admin:", vaultAdmin);
  console.log("  Revenue Address:", revenueAddress);
  console.log("  Assets:", assets.length);
  assets.forEach((asset, i) => {
    console.log(`    [${i}] ${asset}:`);
    console.log(`        Active Vault: ${assetVaults[i][0]}`);
    console.log(`        Total Vaults: ${assetVaults[i].length}`);
    if (assetVaults[i].length > 1) {
      console.log(`        Available Vaults:`);
      assetVaults[i].forEach((vault, j) => {
        console.log(`          - [${j}] ${vault}${j === 0 ? ' (active)' : ''}`);
      });
    }
  });
  console.log("  Total Whitelisted Vaults:", initialAllowedVaults.length);
  console.log("  Withdrawal Fee:", feePercentage / 100, "%");
  console.log("  Rebalance Fee:", rebalanceFeePercentage / 100, "%");
  console.log("  Merkl Claim Fee:", merklClaimFeePercentage / 100, "%");
  console.log("  Salt:", salt);

  // Compute predicted address
  console.log("\n🔮 Computing vault address...");
  const predictedAddress = await factory.computeVaultAddress(
    vaultOwner,
    vaultAdmin,
    assets,
    assetVaults,
    initialAllowedVaults,
    revenueAddress,
    feePercentage,
    rebalanceFeePercentage,
    merklClaimFeePercentage,
    salt
  );

  console.log("✅ Predicted vault address:", predictedAddress);

  // Get deployment fee
  const deploymentFee = await factory.deploymentFee();
  console.log("\n💰 Deployment fee required:", deploymentFee.toString(), "wei");

  // Deploy vault
  console.log("\n📝 Deploying vault via factory...");
  const tx = await factory.deployVault(
    vaultOwner,
    vaultAdmin,
    assets,
    assetVaults,
    initialAllowedVaults,
    revenueAddress,
    feePercentage,
    rebalanceFeePercentage,
    merklClaimFeePercentage,
    salt,
    { value: deploymentFee }
  );

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

  // Parse VaultDeployed event
  const vaultDeployedEvent = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find((event) => event && event.name === "VaultDeployed");

  const deployedVaultAddress = vaultDeployedEvent.args.vaultAddress;
  console.log("\n✅ UserVault deployed to:", deployedVaultAddress);

  // Verify it matches prediction
  if (deployedVaultAddress.toLowerCase() === predictedAddress.toLowerCase()) {
    console.log("✅ Deployed address matches prediction!");
  } else {
    console.log("⚠️  Warning: Deployed address doesn't match prediction");
  }

  // Get vault contract and verify setup
  console.log("\n🔍 Verifying vault setup...");
  const vault = await hre.ethers.getContractAt("UserVault_V4", deployedVaultAddress);

  const owner = await vault.owner();
  const admin = await vault.admin();
  const revenue = await vault.revenueAddress();
  const withdrawalFee = await vault.feePercentage();
  const rebalanceFee = await vault.rebalanceFeePercentage();
  const merklFee = await vault.merklClaimFeePercentage();

  console.log("  Owner:", owner);
  console.log("  Admin:", admin);
  console.log("  Revenue Address:", revenue);
  console.log("  Withdrawal Fee:", withdrawalFee.toString(), "bps");
  console.log("  Rebalance Fee:", rebalanceFee.toString(), "bps");
  console.log("  Merkl Claim Fee:", merklFee.toString(), "bps");

  // Get allowed assets
  const allowedAssets = await vault.getAllowedAssets();
  console.log("  Allowed Assets:", allowedAssets.length);
  for (const asset of allowedAssets) {
    console.log(`    - ${asset}`);
    const activeVault = await vault.assetToVault(asset);
    const availableVaults = await vault.getAssetAvailableVaults(asset);
    console.log(`      Active Vault: ${activeVault}`);
    console.log(`      Available Vaults (${availableVaults.length}):`);
    availableVaults.forEach((v, idx) => {
      console.log(`        [${idx}] ${v}${v === activeVault ? ' (active)' : ''}`);
    });
  }

  // Save deployment info
  console.log("\n💾 Saving deployment information...");
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    vaultAddress: deployedVaultAddress,
    owner: vaultOwner,
    admin: vaultAdmin,
    revenueAddress: revenueAddress,
    assets: assets,
    assetVaults: assetVaults,
    initialAllowedVaults: initialAllowedVaults,
    feePercentage: feePercentage,
    rebalanceFeePercentage: rebalanceFeePercentage,
    merklClaimFeePercentage: merklClaimFeePercentage,
    salt: salt,
    nonce: nonce,
    timestamp: new Date().toISOString(),
    blockNumber: receipt.blockNumber.toString(),
    transactionHash: tx.hash,
  };

  // Create deployments directory if it doesn't exist
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }

  fs.writeFileSync(
    `./deployments/vault-${hre.network.name}-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("✅ Deployment info saved!");

  // Instructions
  console.log("\n" + "=".repeat(80));
  console.log("📋 NEXT STEPS:");
  console.log("=".repeat(80));
  console.log(`
1. Update config.js with the vault address:
   VAULT_ADDRESS: "${deployedVaultAddress}"

2. Approve tokens before depositing:
   For USDC: Call approve on USDC contract to allow vault to spend tokens

3. Make initial deposit:
   npx hardhat run scripts/3-initial-deposit.js --network ${hre.network.name}

4. (Optional) Verify vault contract on block explorer

5. Start using vault functions:
   - User deposits
   - Withdrawals
   - Merkl reward claims
`);

  console.log("✨ Vault deployment completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
