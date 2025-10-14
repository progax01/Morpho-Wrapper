const fetch = require("node-fetch");

const USER_VAULT_ADDRESS ="0x87D3A7a0f1426c31ae31b7E3Fd1c71F49e7d93f6"// "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9";

// Major chains supported by Merkl
const SUPPORTED_CHAINS = [
    { id: 1, name: "Ethereum" },
    { id: 10, name: "Optimism" },
    { id: 56, name: "BSC" },
    { id: 100, name: "Gnosis" },
    { id: 137, name: "Polygon" },
    { id: 324, name: "zkSync Era" },
    { id: 8453, name: "Base" },
    { id: 42161, name: "Arbitrum One" },
    { id: 43114, name: "Avalanche" },
    { id: 59144, name: "Linea" },
    { id: 534352, name: "Scroll" },
    { id: 1101, name: "Polygon zkEVM" },
    { id: 5000, name: "Mantle" },
    { id: 169, name: "Manta Pacific" },
    { id: 34443, name: "Mode" }
];

async function checkCrossChainRewards() {
    console.log("🌐 CROSS-CHAIN MERKL REWARDS CHECK");
    console.log("=" .repeat(50));
    console.log(`Contract Address: ${USER_VAULT_ADDRESS}`);
    console.log("");
    
    let totalValueUSD = 0;
    let hasRewards = false;
    
    for (const chain of SUPPORTED_CHAINS) {
        try {
            const apiUrl = `https://api.merkl.xyz/v4/users/${USER_VAULT_ADDRESS}/rewards?chainId=${chain.id}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                continue; // Skip chains that return errors
            }
            
            const data = await response.json();
            
            if (!data || !Array.isArray(data) || data.length === 0) {
                continue; // No data for this chain
            }
            
            const chainData = data[0];
            if (!chainData.rewards || chainData.rewards.length === 0) {
                continue; // No rewards for this chain
            }
            
            console.log(`🔗 ${chain.name} (Chain ID: ${chain.id})`);
            console.log("-".repeat(30));
            
            let chainTotalUSD = 0;
            
            for (const reward of chainData.rewards) {
                const token = reward.token;
                const claimableAmount = parseFloat(reward.amount) / Math.pow(10, token.decimals);
                const pendingAmount = parseFloat(reward.pending) / Math.pow(10, token.decimals);
                const claimedAmount = parseFloat(reward.claimed) / Math.pow(10, token.decimals);
                
                const claimableValue = claimableAmount * (token.price || 0);
                const pendingValue = pendingAmount * (token.price || 0);
                const claimedValue = claimedAmount * (token.price || 0);
                
                if (claimableAmount > 0 || pendingAmount > 0 || claimedAmount > 0) {
                    hasRewards = true;
                    
                    console.log(`  Token: ${token.symbol} (${token.address})`);
                    console.log(`  💰 Claimable: ${claimableAmount.toFixed(6)} ${token.symbol} ($${claimableValue.toFixed(2)})`);
                    console.log(`  ⏳ Pending: ${pendingAmount.toFixed(6)} ${token.symbol} ($${pendingValue.toFixed(2)})`);
                    console.log(`  ✅ Claimed: ${claimedAmount.toFixed(6)} ${token.symbol} ($${claimedValue.toFixed(2)})`);
                    
                    if (reward.proofs && reward.proofs.length > 0) {
                        console.log(`  📋 Proofs: ${reward.proofs.length} available`);
                        console.log(`  🎯 Ready to claim: YES`);
                    } else if (claimableAmount > 0) {
                        console.log(`  📋 Proofs: Not yet available`);
                        console.log(`  🎯 Ready to claim: NO (proofs pending)`);
                    }
                    
                    console.log("");
                    
                    chainTotalUSD += claimableValue + pendingValue;
                }
            }
            
            if (chainTotalUSD > 0) {
                console.log(`  💵 Chain Total: $${chainTotalUSD.toFixed(2)}`);
                console.log("");
                totalValueUSD += chainTotalUSD;
            }
            
        } catch (error) {
            console.log(`❌ Error fetching ${chain.name}: ${error.message}`);
        }
    }
    
    console.log("📊 SUMMARY");
    console.log("=".repeat(20));
    if (hasRewards) {
        console.log(`💰 Total Value (Claimable + Pending): $${totalValueUSD.toFixed(2)}`);
        console.log("");
        console.log("📝 NEXT STEPS:");
        console.log("1. For chains with claimable amounts and proofs, you can claim immediately");
        console.log("2. For pending rewards, check back in a few days");
        console.log("3. Use the generateClaimData.js script for specific chain claim data");
    } else {
        console.log("❌ No rewards found across any supported chains");
        console.log("");
        console.log("💡 This could mean:");
        console.log("- Contract hasn't participated in reward-eligible activities");
        console.log("- Rewards haven't started accruing yet");
        console.log("- All rewards have been claimed already");
    }
}

crossChainRewards().catch(console.error);

async function crossChainRewards() {
    await checkCrossChainRewards();
}