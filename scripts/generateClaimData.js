const fetch = require("node-fetch");

const USER_VAULT_ADDRESS = "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9";
const BASE_CHAIN_ID = 8453;

async function generateClaimData() {
    console.log("🔧 FIXED CLAIM DATA GENERATOR");
    console.log("=" * 40);
    console.log("Contract Address:", USER_VAULT_ADDRESS);
    console.log("");
    
    try {
        // Fetch the latest reward data
        const apiUrl = `https://api.merkl.xyz/v4/users/${USER_VAULT_ADDRESS}/rewards?chainId=${BASE_CHAIN_ID}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log("❌ No rewards data found");
            return;
        }
        
        const reward = data[0].rewards[0];
        const token = reward.token;
        const amount = reward.amount;
        const proofs = reward.proofs;
        
        console.log("🎉 REWARD FOUND:");
        console.log(`Token: ${token.symbol} (${token.address})`);
        console.log(`Amount: ${amount} (${(parseFloat(amount) / Math.pow(10, token.decimals)).toFixed(6)} ${token.symbol})`);
        console.log(`Proofs: ${proofs.length} items`);
        console.log("");
        
        console.log("🔧 CORRECTED FUNCTION CALL:");
        console.log("=" * 30);
        console.log("Function: claimMerklReward");
        console.log("");
        console.log("Parameters:");
        console.log(`  token: "${token.address}"`);
        console.log(`  claimable: "${amount}"`);
        console.log("  proof: [");
        proofs.forEach((proof, index) => {
            console.log(`    "${proof}"${index < proofs.length - 1 ? ',' : ''}`);
        });
        console.log("  ]");
        console.log("");
        
        console.log("📋 COPY-PASTE READY (for Etherscan/Remix):");
        console.log("=" * 40);
        console.log(`"${token.address}","${amount}",[${proofs.map(p => `"${p}"`).join(',')}]`);
        console.log("");
        
        console.log("🚀 WEB3 CALL EXAMPLE:");
        console.log("=" * 25);
        console.log(`await userVaultContract.claimMerklReward(`);
        console.log(`  "${token.address}",`);
        console.log(`  "${amount}",`);
        console.log(`  [${proofs.map(p => `"${p}"`).join(', ')}]`);
        console.log(`);`);
        console.log("");
        
        console.log("✅ WHAT WILL HAPPEN:");
        console.log("1. Contract converts to array format internally");
        console.log("2. Calls Merkl Distributor with correct batch interface");
        console.log("3. Claims rewards to your contract address");
        console.log("4. Forwards MORPHO tokens to your wallet");
        console.log(`5. You receive ~${(parseFloat(amount) / Math.pow(10, token.decimals) * token.price).toFixed(2)} USD worth of MORPHO`);
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

generateClaimData().catch(console.error);