# UserVault Factory - Cross-Chain Deployment Guide

## 🏭 Overview

The UserVaultFactory enables deterministic deployment of UserVault_V3 contracts across multiple blockchains using CREATE2. This ensures **identical contract addresses** on all chains, enabling seamless cross-chain Merkl reward claiming.

## 🎯 Key Benefits

- ✅ **Same address across all chains** - Deploy to identical addresses on Base, Arbitrum, Optimism, etc.
- ✅ **Cross-chain Merkl rewards** - Claim rewards from any supported chain
- ✅ **No stuck funds** - Same owner controls all instances
- ✅ **Gas efficient** - Deploy only when needed
- ✅ **Upgradeable** - Add new chains as Merkl expands

## 📋 Quick Start

### 1. Deploy Factory Contract

```bash
# Deploy factory on each target chain
npx hardhat run scripts/deployFactory.js --network base
npx hardhat run scripts/deployFactory.js --network arbitrum  
npx hardhat run scripts/deployFactory.js --network optimism
```

### 2. Generate Deployment Plan

```bash
# Generate cross-chain deployment plan
node scripts/crossChainDeploy.js
```

### 3. Deploy Vault Across Chains

```javascript
// Example deployment
const factory = await ethers.getContractAt("UserVaultFactory", FACTORY_ADDRESS);

const salt = await factory.generateDeterministicSalt(ownerAddress, nonce);
const predictedAddress = await factory.computeVaultAddress(
    owner,
    admin, 
    asset,
    initialVaults,
    revenueAddress,
    feePercentage,
    initialDepositAmount,
    salt
);

// Deploy with same parameters on each chain
const tx = await factory.deployVault(
    owner,
    admin,
    asset,
    initialVaults,
    revenueAddress,
    feePercentage,
    initialDepositAmount,
    salt,
    { value: ethers.parseEther("0.01") } // deployment fee
);
```

## 🔧 Factory Contract Functions

### Core Functions

#### `deployVault(...params, salt)`
Deploy a new UserVault_V3 contract with deterministic addressing.

**Parameters:**
- `owner` - Vault owner address
- `admin` - Vault admin address  
- `asset` - Primary asset (USDC) address for this chain
- `initialVaults` - Array of MetaMorpho vault addresses for this chain
- `revenueAddress` - Address to receive fees
- `feePercentage` - Fee percentage in basis points (100 = 1%)
- `initialDepositAmount` - Minimum initial deposit required
- `salt` - Deterministic salt for cross-chain consistency

**Returns:**
- `vaultAddress` - Address of deployed vault

#### `computeVaultAddress(...params, salt)`
Calculate the address where a vault would be deployed (view function).

#### `generateDeterministicSalt(owner, nonce)`
Generate a consistent salt for cross-chain deployment.

#### `deployVaultWithNonce(...params, nonce)` 
Convenience function that auto-generates salt from nonce.

### Registry Functions

#### `registerCrossChainVault(vaultAddress, owner, admin, chainId, salt)`
Register a vault deployed on another chain for tracking (owner only).

#### `getOwnerVaults(owner)`
Get all vault addresses deployed by an owner.

#### `getTotalVaults()`
Get total number of vaults in registry.

## 🌐 Cross-Chain Deployment Steps

### Step 1: Deploy Factory on All Chains

Deploy the factory contract to **exactly the same address** on all target chains:

```bash
# Base Mainnet
npx hardhat run scripts/deployFactory.js --network base

# Arbitrum One  
npx hardhat run scripts/deployFactory.js --network arbitrum

# Optimism
npx hardhat run scripts/deployFactory.js --network optimism

# Polygon (if Merkl supports)
npx hardhat run scripts/deployFactory.js --network polygon
```

### Step 2: Prepare Chain-Specific Parameters

Each chain requires different addresses:

```javascript
const CHAIN_CONFIGS = {
    // Base
    8453: {
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        vaults: [
            "0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e",
            "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738"
        ]
    },
    // Arbitrum
    42161: {
        usdc: "0xA0b86991c31cC506A75b84E4c6c3C6d67a2F2C8",
        vaults: [
            // Add Arbitrum vault addresses
        ]
    }
};
```

### Step 3: Deploy with Same Salt

Use **identical parameters** except chain-specific addresses:

```javascript
// Same across ALL chains
const COMMON_PARAMS = {
    owner: "0x511b0ea6470fC7Ad65aA7010B3626d96a18871D9",
    admin: "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C", 
    revenueAddress: "0x742d35Cc8639C4532B29e4b8BDfE69c5D7D7Fc6C",
    feePercentage: 100, // 1%
    initialDepositAmount: ethers.parseUnits("1000", 6),
    nonce: 1 // SAME NONCE = SAME ADDRESS
};

// Deploy on each chain with chain-specific USDC and vault addresses
```

## 📊 Chain-Specific Addresses

### Base Mainnet (Chain ID: 8453)
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Example Vaults**: 
  - `0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e`
  - `0x616a4E1db48e22028f6bbf20444Cd3b8e3273738`

### Arbitrum One (Chain ID: 42161)
- **USDC**: `0xA0b86991c31cC506A75b84E4c6c3C6d67a2F2C8`
- **Vaults**: [Add Arbitrum MetaMorpho vaults]

### Optimism (Chain ID: 10)
- **USDC**: `0x7F5c764cBc14f9669B88837ca1490cCa17c31607`
- **Vaults**: [Add Optimism MetaMorpho vaults]

## 🔍 Verification

### Check Deployment Success

```javascript
// Verify same address on all chains
const factory = await ethers.getContractAt("UserVaultFactory", factoryAddress);
const vaultInfo = await factory.getVaultInfo(0);

console.log("Vault Address:", vaultInfo.vaultAddress);
console.log("Owner:", vaultInfo.owner);
console.log("Chain ID:", vaultInfo.chainId);
```

### Cross-Chain Verification Script

```bash
# Run verification across all deployed chains
node scripts/verifyDeployments.js
```

## 💰 Deployment Costs

- **Factory Deployment**: ~0.02-0.05 ETH per chain
- **Vault Deployment**: 0.01 ETH per vault (configurable)
- **Total for 5 chains**: ~0.15-0.3 ETH

## 🚨 Important Notes

### ⚠️ Critical Requirements

1. **Factory Address Must Be Identical** - Deploy factory to same address on all chains
2. **Same Salt Required** - Use identical salt for same vault address
3. **Parameter Consistency** - Only USDC and vault addresses should differ by chain
4. **Nonce Management** - Track nonces to avoid conflicts

### 🔐 Security Considerations

- Factory owner can pause deployments
- Deployment fees prevent spam
- Only whitelisted vaults in deployment parameters
- Owner controls all deployed vaults

### 🐛 Troubleshooting

#### Different Addresses on Chains
- Check factory addresses are identical
- Verify salt and parameters are exactly the same
- Ensure nonce hasn't been used before

#### Deployment Fails
- Check deployment fee is sufficient
- Verify all parameters are valid
- Ensure vault addresses exist on target chain

#### Merkl Claims Fail
- Confirm vault deployed to expected address
- Check admin approved as Merkl operator
- Verify proofs are for correct contract address

## 📞 Support

For issues or questions:
1. Check deployment logs for errors
2. Verify factory and vault addresses
3. Test on testnet first
4. Use verification scripts to debug

## 🔗 Related Files

- `contracts/UserVaultFactory.sol` - Factory contract
- `contracts/UserVault_V3.sol` - Vault implementation  
- `scripts/deployFactory.js` - Factory deployment script
- `scripts/crossChainDeploy.js` - Cross-chain planning helper