const { ethers } = require("hardhat");

async function main() {
    console.log("🏭 DEPLOYING USERVAULT FACTORY");
    console.log("=".repeat(40));
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    console.log("");
    
    // Factory deployment parameters
    const DEPLOYMENT_FEE = ethers.parseEther("0.01"); // 0.01 ETH fee to deploy a vault
    const FEE_RECIPIENT = deployer.address; // Factory owner receives deployment fees
    
    console.log("📋 DEPLOYMENT PARAMETERS:");
    console.log("- Deployment Fee:", ethers.formatEther(DEPLOYMENT_FEE), "ETH");
    console.log("- Fee Recipient:", FEE_RECIPIENT);
    console.log("");
    
    // Deploy factory
    console.log("🚀 Deploying UserVaultFactory...");
    const UserVaultFactory = await ethers.getContractFactory("UserVaultFactory");
    const factory = await UserVaultFactory.deploy(
        deployer.address, // initial owner
        DEPLOYMENT_FEE,
        FEE_RECIPIENT
    );
    
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    
    console.log("✅ UserVaultFactory deployed to:", factoryAddress);
    console.log("");
    
    // Example: Calculate predicted address for a vault
    console.log("🔮 EXAMPLE: CROSS-CHAIN VAULT PREDICTION");
    console.log("=".repeat(45));
    
    // Example vault parameters
    const exampleOwner = "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C"; // Example address
    const exampleAdmin = "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C";
    const exampleAsset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
    const exampleInitialVaults = [
        "0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e",
        "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738"
    ];
    const exampleRevenueAddress = "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C";
    const exampleFeePercentage = 100; // 1%
    const exampleInitialDepositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    const exampleNonce = 1;
    
    // Generate deterministic salt
    const salt = await factory.generateDeterministicSalt(exampleOwner, exampleNonce);
    console.log("Generated Salt:", salt);
    
    // Predict address
    const predictedAddress = await factory.computeVaultAddress(
        exampleOwner,
        exampleAdmin,
        exampleAsset,
        exampleInitialVaults,
        exampleRevenueAddress,
        exampleFeePercentage,
        exampleInitialDepositAmount,
        salt
    );
    
    console.log("🎯 Predicted Vault Address:", predictedAddress);
    console.log("");
    console.log("💡 This address will be the SAME on all chains when deployed with:");
    console.log("   - Same factory contract");
    console.log("   - Same parameters");
    console.log("   - Same salt");
    console.log("");
    
    // Display deployment information
    console.log("📊 DEPLOYMENT SUMMARY");
    console.log("=".repeat(25));
    console.log("Factory Address:", factoryAddress);
    console.log("Network:", await deployer.provider.getNetwork().then(n => n.name));
    console.log("Chain ID:", await deployer.provider.getNetwork().then(n => n.chainId.toString()));
    console.log("");
    
    console.log("🔧 NEXT STEPS:");
    console.log("1. Deploy this same factory on other chains with identical parameters");
    console.log("2. Use the same salt to deploy vaults on multiple chains");
    console.log("3. Each vault will have the same address across all chains");
    console.log("4. Merkl rewards can be claimed from the same address on any chain");
    console.log("");
    
    console.log("📝 EXAMPLE DEPLOYMENT CALL:");
    console.log("await factory.deployVault(");
    console.log(`  "${exampleOwner}",`);
    console.log(`  "${exampleAdmin}",`);
    console.log(`  "${exampleAsset}",`);
    console.log(`  ["${exampleInitialVaults.join('", "')}"],`);
    console.log(`  "${exampleRevenueAddress}",`);
    console.log(`  ${exampleFeePercentage},`);
    console.log(`  "${exampleInitialDepositAmount}",`);
    console.log(`  "${salt}",`);
    console.log(`  { value: ethers.parseEther("0.01") }`);
    console.log(");");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });