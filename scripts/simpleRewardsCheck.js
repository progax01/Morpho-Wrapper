const fetch = require("node-fetch");

// Your deployed contract address
const USER_VAULT_ADDRESS = "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9";
const BASE_CHAIN_ID = 8453;
const MERKL_API_BASE = "https://api.merkl.xyz/v4";

async function checkRewards() {
    console.log("🔍 Checking Merkl rewards...");
    console.log("Contract Address:", USER_VAULT_ADDRESS);
    console.log("Chain ID:", BASE_CHAIN_ID);
    console.log("");
    
    try {
        const apiUrl = `${MERKL_API_BASE}/users/${USER_VAULT_ADDRESS}/rewards?chainId=${BASE_CHAIN_ID}`;
        console.log("API URL:", apiUrl);
        
        const response = await fetch(apiUrl);
        const responseText = await response.text();
        
        console.log("Response Status:", response.status);
        console.log("Response Text:", responseText);
        
        if (!response.ok) {
            console.log("❌ API request failed");
            if (response.status === 404) {
                console.log("💡 No rewards found - this is normal for new deposits");
                console.log("   Wait 8-24 hours for rewards to appear");
            }
            return;
        }
        
        let rewardsData;
        try {
            rewardsData = JSON.parse(responseText);
        } catch (e) {
            console.log("❌ Invalid JSON response");
            return;
        }
        
        console.log("\n✅ Raw API Response:");
        console.log(JSON.stringify(rewardsData, null, 2));
        
        if (!rewardsData || typeof rewardsData !== 'object' || Object.keys(rewardsData).length === 0) {
            console.log("\n❌ No rewards data found");
            console.log("💡 This could mean:");
            console.log("   - Rewards haven't been distributed yet");
            console.log("   - Your deposit is too recent");
            console.log("   - The vault isn't in an active Merkl campaign");
            return;
        }
        
        console.log("\n🎉 Found rewards data!");
        
        // Process each reward token
        for (const [tokenAddress, tokenData] of Object.entries(rewardsData)) {
            console.log(`\n🪙 Token: ${tokenAddress}`);
            console.log("   Data:", JSON.stringify(tokenData, null, 4));
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

async function main() {
    console.log("🚀 Simple Merkl Rewards Checker");
    console.log("=" * 50);
    await checkRewards();
    console.log("\n✅ Done!");
}

main().catch(console.error);