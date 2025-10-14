const { ethers } = require("hardhat");

const USER_VAULT_ADDRESS = "0xFe2DA9e88da557fE1fd30122072fE5CD62368210";
const MERKL_DISTRIBUTOR = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae";

// Merkl Distributor ABI for checking permissions
const MERKL_ABI = [
    // Read functions
    "function operators(address user, address operator) external view returns (uint256)",
    "function canUpdateMerkleRoot(address eoa) external view returns (uint256)",
    "function onlyOperatorCanClaim(address user) external view returns (uint256)",
    
    // Core contract functions
    "function core() external view returns (address)",
    
    // Write functions  
    "function toggleOperator(address user, address operator) external",
    "function toggleOnlyOperatorCanClaim(address user) external"
];

async function checkPermissions() {
    console.log("🔍 CHECKING MERKL OPERATOR PERMISSIONS");
    console.log("=" * 50);
    console.log("Contract Address:", USER_VAULT_ADDRESS);
    console.log("Merkl Distributor:", MERKL_DISTRIBUTOR);
    console.log("");
    
    try {
        const [signer] = await ethers.getSigners();
        const userWallet = signer.address;
        
        console.log("Your Wallet:", userWallet);
        console.log("");
        
        // Connect to Merkl Distributor
        const distributor = new ethers.Contract(MERKL_DISTRIBUTOR, MERKL_ABI, signer);
        
        // Check current operator status
        console.log("📋 CURRENT PERMISSIONS:");
        console.log("=" * 30);
        
        try {
            const isOperator = await distributor.operators(USER_VAULT_ADDRESS, userWallet);
            console.log(`Is ${userWallet} operator for contract: ${isOperator.toString()}`);
        } catch (error) {
            console.log("❌ Could not check operator status:", error.message);
        }
        
        try {
            const onlyOperatorCanClaim = await distributor.onlyOperatorCanClaim(USER_VAULT_ADDRESS);
            console.log(`Only operator can claim for contract: ${onlyOperatorCanClaim.toString()}`);
        } catch (error) {
            console.log("❌ Could not check operator-only mode:", error.message);
        }
        
        try {
            const canUpdateRoot = await distributor.canUpdateMerkleRoot(userWallet);
            console.log(`Can ${userWallet} update merkle root: ${canUpdateRoot.toString()}`);
        } catch (error) {
            console.log("❌ Could not check root update permission:", error.message);
        }
        
        // Check core contract (governance)
        try {
            const coreAddress = await distributor.core();
            console.log(`Core contract: ${coreAddress}`);
        } catch (error) {
            console.log("❌ Could not get core contract:", error.message);
        }
        
        console.log("\n🔍 TOGGLEOPERATOR PERMISSION ANALYSIS:");
        console.log("=" * 40);
        console.log("From the Merkl Distributor contract modifier:");
        console.log("onlyTrustedOrUser(address user):");
        console.log("  - user != msg.sender AND");
        console.log("  - canUpdateMerkleRoot[msg.sender] != 1 AND"); 
        console.log("  - !core.isGovernorOrGuardian(msg.sender)");
        console.log("  = revert NotTrusted()");
        console.log("");
        console.log("✅ WHO CAN CALL toggleOperator:");
        console.log("1. The user themselves (contract owner)");
        console.log("2. Trusted EOAs (canUpdateMerkleRoot = 1)");
        console.log("3. Governor or Guardian from Core contract");
        console.log("");
        
        console.log("🚨 PROBLEM DIAGNOSIS:");
        console.log("You're trying to call toggleOperator for your contract,");
        console.log("but you might not have the right permissions.");
        console.log("");
        
        console.log("💡 SOLUTIONS:");
        console.log("=" * 15);
        console.log("Option 1: Call from your contract (recommended)");
        console.log("  - Use your UserVault contract owner functions");
        console.log("  - The contract can toggle operators for itself");
        console.log("");
        
        console.log("Option 2: Check if your wallet has special permissions");
        console.log("  - Check canUpdateMerkleRoot for your address");
        console.log("  - Check if you're governor/guardian via Core contract");
        console.log("");
        
        console.log("Option 3: Use contract's built-in function");
        console.log("  - Your contract already has admin approved as operator");
        console.log("  - Check: isAdminApprovedForMerkl()");
        
        // Test if we can call from contract perspective
        console.log("\n🔧 TESTING YOUR CONTRACT'S MERKL STATUS:");
        console.log("=" * 35);
        
        try {
            // Check if contract has UserVault interface
            const userVault = await ethers.getContractAt("UserVault_V3", USER_VAULT_ADDRESS);
            
            const contractOwner = await userVault.owner();
            const contractAdmin = await userVault.admin();
            const isAdminApproved = await userVault.isAdminApprovedForMerkl();
            
            console.log(`Contract Owner: ${contractOwner}`);
            console.log(`Contract Admin: ${contractAdmin}`);
            console.log(`Admin Approved for Merkl: ${isAdminApproved}`);
            
            if (userWallet.toLowerCase() === contractOwner.toLowerCase()) {
                console.log("✅ You are the contract owner!");
                console.log("💡 You should be able to use contract functions directly");
            } else {
                console.log("❌ You are not the contract owner");
            }
            
        } catch (error) {
            console.log("❌ Could not check contract status:", error.message);
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

async function main() {
    await checkPermissions();
    
    console.log("\n🎯 RECOMMENDED ACTION:");
    console.log("=" * 25);
    console.log("Instead of calling toggleOperator directly,");
    console.log("use your contract's claimMerklReward function.");
    console.log("It handles everything automatically!");
    console.log("");
    console.log("Function: claimMerklReward");
    console.log("Parameters: token, amount, proof");
    console.log("Result: Claims and forwards to your wallet");
}

main().catch(console.error);