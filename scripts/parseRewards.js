const fetch = require("node-fetch");

const USER_VAULT_ADDRESS ="0x87D3A7a0f1426c31ae31b7E3Fd1c71F49e7d93f6" //"0x87D3A7a0f1426c31ae31b7E3Fd1c71F49e7d93f6"//"";
const BASE_CHAIN_ID = 8453;
const OPTIMISM_CHAIN_ID = 10;
const MERKL_API_BASE = "https://api.merkl.xyz/v4";

function formatTokenAmount(amount, decimals) {
    const divisor = BigInt(10 ** decimals);
    const wholePart = BigInt(amount) / divisor;
    const fractionalPart = BigInt(amount) % divisor;
    return `${wholePart}.${fractionalPart.toString().padStart(decimals, '0').slice(0, 6)}`;
}

async function parseRewards() {
    console.log("🎉 CONGRATULATIONS! You have MORPHO rewards!");
    console.log("=" * 50);
    console.log("Contract Address:", USER_VAULT_ADDRESS);
    console.log("");
    
    try {
        const apiUrl = `${MERKL_API_BASE}/users/${USER_VAULT_ADDRESS}/rewards?chainId=${BASE_CHAIN_ID}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("❌ No rewards data found");
            return;
        }
        
        const chainData = data[0]; // First element contains chain and rewards info
        
        console.log("📊 REWARD DETAILS:");
        console.log("=" * 30);
        
        if (chainData.rewards && Array.isArray(chainData.rewards)) {
            for (const reward of chainData.rewards) {
                const token = reward.token;
                const amount = reward.amount;
                const claimed = reward.claimed;
                const pending = reward.pending;
                const proofs = reward.proofs;
                
                // Calculate claimable amount (amount - claimed - pending)
                const claimableAmount = BigInt(amount) - BigInt(claimed);
                
                console.log(`🪙 Token: ${token.symbol} (${token.address})`);
                console.log(`   Decimals: ${token.decimals}`);
                console.log(`   Price: $${token.price}`);
                console.log(`   Total Earned: ${formatTokenAmount(amount, token.decimals)} ${token.symbol}`);
                console.log(`   Already Claimed: ${formatTokenAmount(claimed, token.decimals)} ${token.symbol}`);
                console.log(`   Pending: ${formatTokenAmount(pending, token.decimals)} ${token.symbol}`);
                console.log(`   🎯 CLAIMABLE: ${formatTokenAmount(claimableAmount.toString(), token.decimals)} ${token.symbol}`);
                
                // Calculate USD value
                const claimableFloat = parseFloat(formatTokenAmount(claimableAmount.toString(), token.decimals));
                const usdValue = claimableFloat * token.price;
                console.log(`   💰 USD Value: $${usdValue.toFixed(2)}`);
                
                console.log(`   📁 Merkle Proofs: ${proofs.length} items`);
                console.log(`   🔐 Root: ${reward.root}`);
                
                console.log("\n📋 CLAIM DATA FOR YOUR CONTRACT:");
                console.log("   Copy this data to claim your rewards:");
                console.log(`   Token Address: "${token.address}"`);
                console.log(`   Claimable Amount: "${claimableAmount.toString()}"`);
                console.log(`   Merkle Proof: [`);
                proofs.forEach((proof, index) => {
                    console.log(`     "${proof}"${index < proofs.length - 1 ? ',' : ''}`);
                });
                console.log(`   ]`);
                
                console.log("\n🔧 FUNCTION CALL:");
                console.log("   Use your contract's claimMerklReward function:");
                console.log(`   claimMerklReward(`);
                console.log(`     "${token.address}",`);
                console.log(`     "${claimableAmount.toString()}",`);
                console.log(`     [${proofs.map(p => `"${p}"`).join(', ')}]`);
                console.log(`   )`);
                
                if (reward.breakdowns && reward.breakdowns.length > 0) {
                    console.log("\n📈 CAMPAIGN DETAILS:");
                    reward.breakdowns.forEach((breakdown, index) => {
                        console.log(`   Campaign ${index + 1}:`);
                        console.log(`     Amount: ${formatTokenAmount(breakdown.amount, token.decimals)} ${token.symbol}`);
                        console.log(`     Campaign ID: ${breakdown.campaignId}`);
                        console.log(`     Reason: ${breakdown.reason}`);
                    });
                }
                
                console.log("\n" + "=" * 60);
            }
        }
        
        console.log("\n✅ NEXT STEPS:");
        console.log("1. 📱 Visit Merkl dashboard: https://app.merkl.xyz/users/" + USER_VAULT_ADDRESS);
        console.log("2. 🔧 Use the claim data above with your contract");
        console.log("3. 💸 Claim rewards using claimMerklReward function");
        console.log("4. 🎯 Rewards will be sent directly to your wallet");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

parseRewards().catch(console.error);