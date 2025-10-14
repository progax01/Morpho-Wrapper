// filename: claim-eusd.js
// ENV: RPC_URL=<rpc url>  PRIVATE_KEY=<owner's pk>
// RUN:  node claim-eusd.js

const { ethers } = require("ethers");

const VAULT  = "0x87D3A7a0f1426c31ae31b7E3Fd1c71F49e7d93f6";
const TOKEN  = "0x4200000000000000000000000000000000000042";

// SURF token parameters (set to zero/dummy values if not claiming SURF)
const SURF_CLAIM_AMOUNT = "100"; // Set to desired SURF amount if claiming
const SURF_TOKEN = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"; // Replace with actual SURF token address
const SURF_PAYER = "0x4C1C23901d99167a76D24cE3de87049fc8435668"; // Replace with actual SURF payer address

// IMPORTANT: pass the CUMULATIVE amount from the Merkle leaf
const AMOUNT_CUMULATIVE = "660061483907627"; // 0.001420570660341135 eUSD (18 decimals)

const PROOF = ["0xe9f3c2feacaa6f686eecc1d4b7af2bc96492c06763cb5460bb42871a88a224d1", "0xa03f0846861defe872f6a16cbbc5cd3665dd5781d03416daac743184f29fc19f", "0x161dc8eb056573ad22d4129e94ea340f5b07ca4ef801f6d73af49e2051f708eb", "0xe7b8d3c9db975c4e27700b4a9397c5287292eaa1fcdf3d72d438cdc160ab4d65", "0xe0eaa7b5fb6460c6148f8511674dbacd1b75dbf0a90f997dac11659077e21992", "0x26d28e983e2c3c5cb333d049f1ba0415cff54c06f458a78bad34a39b635c917e", "0x9906f6b41bd2c8d08266d7d11d3d03cb401f339040e6f333ce36dc3455967b86", "0x1653fb5e15593e70cd58c653c1e7f7799eee2e3f8bb577fcb29d4baa769675f3", "0x96008ad157738d28d561d43bc7a60d5b926ac576a853faddc0b74f2a7fefef76", "0x362d53ba11deffae98efc9dca58c2b6dee87a2ae4ca3c5fd8433f6c5732a635c", "0xc4ecc02e7bde09990fcd05cef5ccd125e8761cdabf5247b97a511da7d61d80c4", "0x92f2f5434f17ff791c49e2c2c79c1a5e436c6ece9efd6b70823ee5869a8b9729", "0xf8acb8696776b80d9f9d31ad4e208cf027b45c68c1789eeedeee1483f06f614d", "0x2a463b055810c5092cfb15a5d89c1c7d6e85c0861c98eec01db80584fcae4d63", "0x75bdc3e8fa794efe3d35f680ed73dc09f0a7a335a0eb06c1158799a2b4e0240c", "0xf4d91d18defe81d77ac178e23fcf63c88deef547415d08e0d8943bcef1df5943", "0xd022cf91872cc6624b0105e9d0070b8e18b98d8906024248fed76db3ef0ae100", "0xd70a9f147f282b639d909c5790490e06a8ea8a9ccd8c8e288a8c237b56078863"];
const ABI = [
  "function claimMerklReward(address token, uint256 claimable, bytes32[] proof, uint256 surfClaimAmount, address surfToken, address surfPayer) external",
  "function owner() view returns (address)"
];

async function main() {
  const { RPC_URL, PRIVATE_KEY } = process.env;
  if (!RPC_URL || !PRIVATE_KEY) {
    console.error("Set RPC_URL and PRIVATE_KEY env vars.");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault    = new ethers.Contract(VAULT, ABI, wallet);

  const ownerAddr = await vault.owner();
  if (ownerAddr.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error(`Signer is not vault owner.\nowner(): ${ownerAddr}\nsigner : ${wallet.address}`);
    process.exit(1);
  }

  console.log("Claiming eUSD with cumulative amount:", AMOUNT_CUMULATIVE);

  // estimate + 20% buffer
//   const gas = await vault.estimateGas.claimMerklReward(TOKEN, AMOUNT_CUMULATIVE, PROOF, SURF_CLAIM_AMOUNT, SURF_TOKEN, SURF_PAYER);
  const tx  = await vault.claimMerklReward(TOKEN, AMOUNT_CUMULATIVE, PROOF, SURF_CLAIM_AMOUNT, SURF_TOKEN, SURF_PAYER, {
    // gasLimit: gas.mul(120).div(100)
  });
  console.log("Tx sent:", tx.hash);
  const rcpt = await tx.wait();
  console.log("✅ Confirmed in block:", rcpt.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
