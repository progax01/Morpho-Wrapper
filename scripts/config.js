// Configuration file for contract addresses and parameters
// Update these addresses based on your deployment chain

const config = {
  // Base Mainnet (Chain ID: 8453)
  base: {
    // Token Addresses
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    // Add other token addresses as needed

    // Morpho Vault Addresses (Update with actual vault addresses)
    USDC_VAULT: "0x0000000000000000000000000000000000000000", // Replace with actual USDC Morpho vault
    WETH_VAULT: "0x0000000000000000000000000000000000000000", // Replace with actual WETH Morpho vault

    // Merkl Distributor
    MERKL_DISTRIBUTOR: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",

    // Factory Address (will be set after deployment)
    FACTORY_ADDRESS: "0x0000000000000000000000000000000000000000",

    // Deployed Vault Address (will be set after deployment)
    VAULT_ADDRESS: "0x0000000000000000000000000000000000000000",
  },

  // Optimism Mainnet (Chain ID: 10)
  optimism: {
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    WETH: "0x4200000000000000000000000000000000000006",

    MERKL_DISTRIBUTOR: "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae",

    FACTORY_ADDRESS: "0x0000000000000000000000000000000000000000",
    VAULT_ADDRESS: "0x0000000000000000000000000000000000000000",
  },

  // Deployment parameters
  deployment: {
    deploymentFee: "0", // Fee in wei to deploy a vault (0 for free)
    feePercentage: 100, // 1% withdrawal fee (100 basis points)
    rebalanceFeePercentage: 1000, // 10% rebalance fee (1000 basis points)
    merklClaimFeePercentage: 1000, // 10% Merkl claim fee (1000 basis points)
  },

  // Transaction parameters
  gasLimit: {
    deploy: 10000000,
    initialDeposit: 1000000,
    userDeposit: 800000,
    withdraw: 800000,
    claimMerkl: 500000,
  },
};

// Helper function to get config for current network
async function getNetworkConfig(network) {
  const chainId = await network.provider.send("eth_chainId");
  const chainIdNum = parseInt(chainId, 16);

  if (chainIdNum === 8453) return config.base;
  if (chainIdNum === 10) return config.optimism;

  throw new Error(`Unsupported network: ${chainIdNum}`);
}

module.exports = { config, getNetworkConfig };
