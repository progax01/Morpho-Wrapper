async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Mock deployment parameters
  const owner = deployer.address;
  const admin = deployer.address;
  const asset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Real USDC address on Base
  const initialVaults = [
    "0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e",
    "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738"
  ];
  const revenueAddress = deployer.address;
  const feePercentage = 100; // 1%
  const initialDepositAmount = ethers.parseUnits("1000", 6); // $1000 USDC

  const UserVault_V3 = await ethers.getContractFactory("UserVault_V3");
  const userVault = await UserVault_V3.deploy(
    owner,
    admin,
    asset,
    initialVaults,
    revenueAddress,
    feePercentage,
    initialDepositAmount
  );

  await userVault.waitForDeployment();

  console.log("UserVault_V3 deployed to:", await userVault.getAddress());
  
  // Test basic functionality
  console.log("Owner:", await userVault.owner());
  console.log("Admin:", await userVault.admin());
  console.log("Asset:", await userVault.asset());
  console.log("Initial deposit amount:", await userVault.initialDepositAmount());
  console.log("Allowed vaults count:", await userVault.getAllowedVaultsCount());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });