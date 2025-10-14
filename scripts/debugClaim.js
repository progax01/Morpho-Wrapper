const fetch = require("node-fetch");
const { ethers } = require("hardhat");

const USER_VAULT_ADDRESS = "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9";
const MERKL_DISTRIBUTOR = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae";
const BASE_CHAIN_ID = 8453;

async function debugClaim() {
    console.log("🔧 Debug Merkl Claim Function");
    console.log("=" * 40);
    
    try {
        // 1. Get fresh reward data
        console.log("1️⃣ Fetching latest reward data...");
        const apiUrl = `https://api.merkl.xyz/v4/users/${USER_VAULT_ADDRESS}/rewards?chainId=${BASE_CHAIN_ID}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("❌ No rewards data found");
            return;
        }
        
        const reward = data[0].rewards[0]; // First reward
        const token = reward.token;
        const amount = reward.amount;
        const proofs = reward.proofs;
        
        console.log("✅ Reward data found:");
        console.log(`   Token: ${token.symbol} (${token.address})`);
        console.log(`   Amount: ${amount}`);
        console.log(`   Proofs: ${proofs.length} items`);
        
        // 2. Check different claim function signatures
        console.log("\n2️⃣ Testing different claim function signatures...");
        
        // Option 1: Standard Uniswap-style (index, account, amount, proof)
        console.log("\nOption 1 - Uniswap Style:");
        console.log("claim(uint256 index, address account, uint256 amount, bytes32[] proof)");
        
        // Option 2: Morpho-style (account, reward, claimable, proof) 
        console.log("\nOption 2 - Morpho Style:");
        console.log("claim(address account, address reward, uint256 claimable, bytes32[] proof)");
        
        // Option 3: Angle/Merkl style with different parameters
        console.log("\nOption 3 - Angle/Merkl Style:");
        console.log("claim(address user, address token, uint256 amount, bytes32[] proof)");
        
        // 3. Try to get the actual ABI
        console.log("\n3️⃣ Checking contract at Merkl Distributor address...");
        console.log("Distributor Address:", MERKL_DISTRIBUTOR);
        
        // Create minimal contract to test
        const distributorInterface = new ethers.Interface([
            // Try different function signatures
            "function claim(address account, address reward, uint256 claimable, bytes32[] calldata proof) external returns (uint256)",
            "function claim(uint256 index, address account, uint256 amount, bytes32[] calldata proof) external",
            "function claim(address user, address token, uint256 amount, bytes32[] calldata proof) external",
            "function operators(address user, address operator) external view returns (bool)"
        ]);
        
        // 4. Check if we need an index parameter
        console.log("\n4️⃣ Checking if index parameter is needed...");
        console.log("Some Merkl distributors require an index parameter from the campaign data");
        
        // 5. Show current contract call data
        console.log("\n5️⃣ Current contract call parameters:");
        console.log("Function: claimMerklReward");
        console.log(`Token: "${token.address}"`);
        console.log(`Amount: "${amount}"`);
        console.log(`Proofs: ${proofs.length} items`);
        
        // 6. Generate alternative call formats
        console.log("\n6️⃣ Alternative call formats to try:");
        
        console.log("\nA) If your interface is correct but missing index:");
        console.log("   Add an index parameter (usually 0 for single claims)");
        
        console.log("\nB) Direct Merkl Distributor call (bypass your contract):");
        console.log("   Call the Merkl Distributor directly from your wallet");
        console.log(`   To: ${MERKL_DISTRIBUTOR}`);
        console.log(`   Function: claim(address, address, uint256, bytes32[])`);
        console.log(`   Parameters: ("${USER_VAULT_ADDRESS}", "${token.address}", "${amount}", [proofs...])`);
        
        console.log("\nC) Check if admin needs to be operator:");
        console.log("   Verify admin is approved as Merkl operator");
        
        // 7. Create test transaction data
        console.log("\n7️⃣ Test transaction data:");
        try {
            const testCalldata = distributorInterface.encodeFunctionData("claim", [
                USER_VAULT_ADDRESS,
                token.address, 
                amount,
                proofs
            ]);
            console.log("✅ Calldata generated successfully");
            console.log("This suggests the interface works - check other issues");
        } catch (error) {
            console.log("❌ Calldata generation failed:", error.message);
        }
        
    } catch (error) {
        console.error("❌ Debug error:", error.message);
    }
}

debugClaim().catch(console.error);