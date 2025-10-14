const { ethers } = require("hardhat");

/**
 * Cross-Chain Vault Deployment Script
 * 
 * This script helps deploy UserVault_V3 contracts to the same address across multiple chains
 * for cross-chain Merkl reward claiming.
 */

// Supported chain configurations
const CHAIN_CONFIGS = {
    // Base Mainnet
    8453: {
        name: "Base",
        rpcUrl: "https://base.publicnode.com",
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        explorerUrl: "https://basescan.org"
    },
    // Arbitrum One
    42161: {
        name: "Arbitrum One", 
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        usdc: "0xA0b86991c31cC506A75b84E4c6c3C6d67a2F2C8",
        explorerUrl: "https://arbiscan.io"
    },
    // Optimism
    10: {
        name: "Optimism",
        rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/demo",
        usdc: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
        explorerUrl: "https://optimistic.etherscan.io"
    },
    // Ethereum Mainnet
    1: {
        name: "Ethereum",
        rpcUrl: "https://eth.llamarpc.com",
        usdc: "0xA0b86991c31cC506A75b84E4c6c3C6d67a2F2C8",
        explorerUrl: "https://etherscan.io"
    },
    // Polygon
    137: {
        name: "Polygon",
        rpcUrl: "https://polygon-rpc.com",
        usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        explorerUrl: "https://polygonscan.com"
    }
};

// Example vault configurations for different chains
const VAULT_CONFIGS = {
    // Base - MetaMorpho vaults
    8453: [
        "0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e", // Example vault 1
        "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738", // Example vault 2
        "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca"  // Example vault 3
    ],
    // Add vault addresses for other chains as needed
    42161: [], // Arbitrum vaults
    10: [],    // Optimism vaults  
    1: [],     // Ethereum vaults
    137: []    // Polygon vaults
};

async function generateDeploymentPlan() {
    console.log("🌐 CROSS-CHAIN VAULT DEPLOYMENT PLAN");
    console.log("=".repeat(50));
    
    // User parameters (these should be the same across all chains)
    const owner = "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9"; // Your actual contract address
    const admin = "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C"; // Admin address
    const revenueAddress = "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C"; // Revenue address
    const feePercentage = 100; // 1%
    const initialDepositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    const nonce = 1; // Unique nonce for this deployment
    
    console.log("👤 DEPLOYMENT PARAMETERS:");
    console.log("Owner:", owner);
    console.log("Admin:", admin);
    console.log("Revenue Address:", revenueAddress);
    console.log("Fee Percentage:", feePercentage + "bps (1%)");
    console.log("Initial Deposit Amount:", ethers.formatUnits(initialDepositAmount, 6), "USDC");
    console.log("Nonce:", nonce);
    console.log("");
    
    // Generate salt (same across all chains)
    const saltData = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [owner, nonce]
    );
    
    console.log("🔐 DETERMINISTIC SALT:", saltData);
    console.log("");
    
    // Calculate predicted addresses for each chain
    console.log("🎯 PREDICTED VAULT ADDRESSES BY CHAIN:");
    console.log("-".repeat(50));
    
    const deploymentInstructions = [];
    
    for (const [chainId, config] of Object.entries(CHAIN_CONFIGS)) {
        const chainIdNumber = parseInt(chainId);
        const asset = config.usdc;
        const initialVaults = VAULT_CONFIGS[chainIdNumber] || [];
        
        if (initialVaults.length === 0) {
            console.log(`❌ ${config.name} (${chainId}): No vault configuration available`);
            continue;
        }
        
        // This would need to be calculated by the actual factory contract
        // For demo purposes, showing the structure
        console.log(`✅ ${config.name} (${chainId}):`);
        console.log(`   Asset (USDC): ${asset}`);
        console.log(`   Initial Vaults: ${initialVaults.length} vaults`);
        console.log(`   Explorer: ${config.explorerUrl}`);
        console.log("");
        
        deploymentInstructions.push({
            chainId: chainIdNumber,
            chainName: config.name,
            asset,
            initialVaults,
            rpcUrl: config.rpcUrl,
            explorerUrl: config.explorerUrl
        });
    }
    
    console.log("📋 DEPLOYMENT INSTRUCTIONS:");
    console.log("=".repeat(30));
    console.log("1. Deploy the UserVaultFactory on each target chain");
    console.log("2. Use the SAME factory constructor parameters on all chains");
    console.log("3. Call deployVault() with the SAME parameters and salt on each chain");
    console.log("4. Verify the deployed address is identical across chains");
    console.log("");
    
    console.log("🔧 FACTORY DEPLOYMENT COMMAND (for each chain):");
    console.log("npx hardhat run scripts/deployFactory.js --network <NETWORK>");
    console.log("");
    
    console.log("🚀 VAULT DEPLOYMENT EXAMPLE:");
    deploymentInstructions.forEach((instruction, index) => {
        if (index === 0) { // Show detailed example for first chain
            console.log(`\n// ${instruction.chainName} deployment:`);
            console.log("const factory = await ethers.getContractAt('UserVaultFactory', FACTORY_ADDRESS);");
            console.log("const tx = await factory.deployVault(");
            console.log(`  "${owner}",`);
            console.log(`  "${admin}",`);
            console.log(`  "${instruction.asset}",`);
            console.log(`  [${instruction.initialVaults.map(v => `"${v}"`).join(', ')}],`);
            console.log(`  "${revenueAddress}",`);
            console.log(`  ${feePercentage},`);
            console.log(`  "${initialDepositAmount}",`);
            console.log(`  "${saltData}",`);
            console.log(`  { value: ethers.parseEther("0.01") }`);
            console.log(");");
        }
    });
    
    console.log("");
    console.log("⚠️  IMPORTANT NOTES:");
    console.log("- Factory contract must be deployed to the SAME address on all chains");
    console.log("- All parameters must be IDENTICAL across chains");
    console.log("- USDC addresses vary by chain - update accordingly");
    console.log("- Vault addresses must be valid for each specific chain");
    console.log("- Same salt ensures same deployed address");
    console.log("");
    
    return {
        owner,
        admin,
        revenueAddress,
        feePercentage,
        initialDepositAmount,
        nonce,
        salt: saltData,
        deploymentInstructions
    };
}

async function verifyDeployment(factoryAddress, chainId) {
    console.log(`🔍 VERIFYING DEPLOYMENT ON CHAIN ${chainId}`);
    console.log("=".repeat(40));
    
    try {
        const factory = await ethers.getContractAt("UserVaultFactory", factoryAddress);
        const totalVaults = await factory.getTotalVaults();
        
        console.log("Factory Address:", factoryAddress);
        console.log("Total Deployed Vaults:", totalVaults.toString());
        
        if (totalVaults > 0) {
            console.log("\nDeployed Vaults:");
            for (let i = 0; i < totalVaults; i++) {
                const vaultInfo = await factory.getVaultInfo(i);
                console.log(`${i + 1}. ${vaultInfo.vaultAddress} (Owner: ${vaultInfo.owner})`);
            }
        }
        
        console.log("✅ Verification successful");
        return true;
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        return false;
    }
}

// If run directly
if (require.main === module) {
    generateDeploymentPlan()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    generateDeploymentPlan,
    verifyDeployment,
    CHAIN_CONFIGS,
    VAULT_CONFIGS
};