require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {},
    local: {
      url: "http://127.0.0.1:8545/",
    },
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      // Add your private key here if you want to make transactions
      // accounts: [process.env.PRIVATE_KEY]
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      // Add your private key here if you want to make transactions
      // accounts: [process.env.PRIVATE_KEY]
    },
  },
  etherscan: {
    apiKey: {
      base: "WTPG4BQT475ETANPFF27MQ17VDXMXJWN1C" // BaseScan API key
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};

