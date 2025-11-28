const hre = require("hardhat");
const { config } = require("./config");

async function main() {
  console.log("\n🚀 Starting UserVaultFactory Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Get deployment parameters
  const initialOwner = deployer.address; // Factory owner
  const deploymentFee = config.deployment.deploymentFee; // Fee to deploy vaults (0 for free)
  const feeRecipient = deployer.address; // Address to receive deployment fees

  console.log("\nDeployment Parameters:");
  console.log("  Initial Owner:", initialOwner);
  console.log("  Deployment Fee:", deploymentFee, "wei");
  console.log("  Fee Recipient:", feeRecipient);

  // Deploy UserVaultFactory
  console.log("\n📝 Deploying UserVaultFactory...");
  const UserVaultFactory = await hre.ethers.getContractFactory("UserVaultFactory");
  const factory = await UserVaultFactory.deploy(
    initialOwner,
    deploymentFee,
    feeRecipient
  );

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ UserVaultFactory deployed to:", factoryAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const owner = await factory.owner();
  const fee = await factory.deploymentFee();
  const recipient = await factory.feeRecipient();

  console.log("  Owner:", owner);
  console.log("  Deployment Fee:", fee.toString());
  console.log("  Fee Recipient:", recipient);

  // Save deployment info
  console.log("\n💾 Saving deployment information...");
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    factoryAddress: factoryAddress,
    deployer: deployer.address,
    deploymentFee: deploymentFee,
    feeRecipient: feeRecipient,
    timestamp: new Date().toISOString(),
    blockNumber: (await hre.ethers.provider.getBlockNumber()).toString(),
  };

  fs.writeFileSync(
    `./deployments/factory-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("✅ Deployment info saved to:", `./deployments/factory-${hre.network.name}.json`);

  // Instructions
  console.log("\n" + "=".repeat(80));
  console.log("📋 NEXT STEPS:");
  console.log("=".repeat(80));
  console.log(`
1. Update config.js with the factory address:
   FACTORY_ADDRESS: "${factoryAddress}"

2. Update vault addresses in config.js for your assets

3. Deploy a user vault using:
   npx hardhat run scripts/2-deploy-vault.js --network ${hre.network.name}

4. Verify the contract on block explorer (if needed):
   npx hardhat verify --network ${hre.network.name} ${factoryAddress} "${initialOwner}" "${deploymentFee}" "${feeRecipient}"
`);

  console.log("✨ Factory deployment completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
