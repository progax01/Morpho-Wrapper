// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./Interfaces/IAerodrome.sol";
import "./Interfaces/IMetaMorpho.sol";
import "./Interfaces/IBundler.sol";
import "./Interfaces/IERC20Extended.sol";
import "./Interfaces/IMerklDistributor.sol";

//["0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e","0x616a4E1db48e22028f6bbf20444Cd3b8e3273738","0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca","0xB7890CEE6CF4792cdCC13489D36D9d42726ab863","0x236919F11ff9eA9550A4287696C2FC9e18E6e890","0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183","0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61","0xc0c5689e6f4D256E861F65465b691aeEcC0dEb12","0x1D3b1Cd0a0f242d598834b3F2d126dC6bd774657","0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A","0x12AFDeFb2237a5963e7BAb3e2D46ad0eee70406e","0xbb819D845b573B5D7C538F5b85057160cfb5f313","0xf24608E0CCb972b0b0f4A6446a0BBf58c701a026","0x8c3A6B12332a6354805Eb4b72ef619aEdd22BcdD","0xdB90A4e973B7663ce0Ccc32B6FbD37ffb19BfA83","0x0FaBfEAcedf47e890c50C8120177fff69C6a1d9B","0xCBeeF01994E24a60f7DCB8De98e75AD8BD4Ad60d",   "0xCd347c1e7d600a9A3e403497562eDd0A7Bc3Ef21","0xcdDCDd18A16ED441F6CB10c3909e5e7ec2B9e8f3","0xBeeFa74640a5f7c28966cbA82466EED5609444E0","0xef417a2512C5a41f69AE4e021648b69a7CdE5D03","0xBEEFA7B88064FeEF0cEe02AAeBBd95D30df3878F","0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2","0xE74c499fA461AF1844fCa84204490877787cED56"]
/**
 * @title UserVault
 * @dev Individual user vault contract for yield optimization with asset swapping and bundler integration
 */
contract UserVault_V3 is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Aerodrome contract addresses
    address public constant AERODROME_ROUTER =
        0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address public constant AERODROME_FACTORY =
        0x420DD381b31aEf6683db6B902084cB0FFECe40Da;

    // Bundler addresses
    address public constant ADAPTER_ADDRESS = 0xb98c948CFA24072e58935BC004a8A7b376AE746A;
    address public constant BUNDLER_ADDRESS = 0x6BFd8137e702540E7A42B74178A4a49Ba43920C4;

    // Merkl Distributor address
    address public constant MERKL_DISTRIBUTOR = 0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae;
    
    IBundler3 public constant bundler = IBundler3(BUNDLER_ADDRESS);
    IMerklDistributor public constant merklDistributor = IMerklDistributor(MERKL_DISTRIBUTOR);

    // State variables
    address public immutable owner;
    address public admin;
    address public  asset; // Primary asset (USDC)
    address public currentVault;
    bool public hasInitialDeposit;

    uint256 public totalDeposited;
    uint256 public lastDepositTime;
    
    uint256 public constant SLIPPAGE_TOLERANCE = 500; // 5% in basis points

    address public revenueAddress;
    uint256 public feePercentage; // Fee percentage in basis points (e.g., 100 = 1%)

    uint256 public totalFeesCollected;

    // Enhanced fee configurations

    uint256 public minProfitForFee = 10e6; // $10 in USDC (6 decimals)
    uint256 public initialDepositAmount; // Initial deposit amount set during deployment
    bool public initialDepositMade; // Track if initial deposit has been made

    // Merkl operator approval status
    bool public adminApprovedForMerkl;

    mapping(address => bool) public isAllowedVault;
    address[] public allowedVaults;

    // Events
    event InitialDeposit(address indexed vault, uint256 amount);
    event PeriodicDeposit(
        address indexed fromVault,
        address indexed toVault,
        uint256 amount
    );
    event Withdrawal(
        address indexed vault,
        address indexed recipient,
        uint256 amount
    );
    event VaultAdded(address indexed vault);
    event VaultRemoved(address indexed vault);
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event Rebalanced(
        address indexed fromVault,
        address indexed toVault,
        uint256 amount
    );
    event AssetSwapped(
        address indexed fromAsset,
        address indexed toAsset,
        uint256 amountIn,
        uint256 amountOut
    );

    event RevenueAddressUpdated(
        address indexed oldAddress,
        address indexed newAddress
    );
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollected(
        address indexed vault,
        uint256 feeAmount,
        uint256 userAmount
    );
    event RebalanceFeeCollected(
        address indexed fromVault,
        address indexed toVault,
        uint256 profit,
        uint256 feeAmount
    );
    event InitialDepositExecuted(address indexed vault, uint256 amount);

    // Merkl events
    event MerklOperatorApproved(address indexed admin);
    event MerklTokensClaimed(address indexed token, uint256 amount);
    event SurfTransferred(address indexed token, uint256 amount, address indexed recipient);
    event FeeCalculated(uint256 totalAmount, uint256 profit, uint256 feeAmount, uint256 userAmount);
    event MinProfitForFeeUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(
        address _owner,
        address _admin,
        address _asset,
        address[] memory _initialVaults,
        address _revenueAddress,
        uint256 _feePercentage,
        uint256 _initialDepositAmount
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_admin != address(0), "Invalid admin");
        require(_asset != address(0), "Invalid asset");
        require(_initialVaults.length > 0, "No initial vaults");
        require(_revenueAddress != address(0), "Invalid revenue address");
        // require(_feePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        require(_initialDepositAmount > 0, "Initial deposit must be positive");

        owner = _owner;
        admin = _admin;
        asset = _asset;
        revenueAddress = _revenueAddress;
        feePercentage = _feePercentage;
        initialDepositAmount = _initialDepositAmount;

        // Add initial vaults to whitelist
        for (uint256 i = 0; i < _initialVaults.length; i++) {
            require(_initialVaults[i] != address(0), "Invalid vault address");
            isAllowedVault[_initialVaults[i]] = true;
            allowedVaults.push(_initialVaults[i]);
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(
            msg.sender == owner || msg.sender == admin,
            "Only owner or admin"
        );
        _;
    }

    modifier onlyAllowedVault(address vault) {
        require(isAllowedVault[vault], "Vault not allowed");
        _;
    }


    /**
     * @dev NEW: Approve admin as Merkl operator during initial deposit
     * This allows admin to claim Merkl rewards on behalf of this contract
     */
    function _approveMerklOperator() internal {
        if (!adminApprovedForMerkl) {
            merklDistributor.toggleOperator(address(this), admin);
            adminApprovedForMerkl = true;
            emit MerklOperatorApproved(admin);
        }
    }

    /**
     * @dev NEW: Deposit to vault using bundler
     * @param vault The vault address to deposit into
     * @param amount The amount of assets to deposit
     * @param vaultAsset The asset token address for the vault
     */
    function _depositToVaultViaBundler(
        address vault,
        uint256 amount,
        address vaultAsset
    ) internal {
        // Approve the adapter to spend tokens
        IERC20(vaultAsset).approve(ADAPTER_ADDRESS, amount);
        
        // Create calls array
        Call[] memory calls = new Call[](2);
        
        // First call: erc20TransferFrom - transfer tokens from this contract to adapter
        calls[0] = Call({
            to: ADAPTER_ADDRESS,
            data: abi.encodeWithSelector(
                bytes4(0xd96ca0b9), // erc20TransferFrom selector
                vaultAsset,          // token address
                ADAPTER_ADDRESS,     // receiver (adapter)
                amount              // amount
            ),
            value: 0,
            skipRevert: false,
            callbackHash: bytes32(0)
        });
        
        // Second call: erc4626Deposit - deposit into vault
        calls[1] = Call({
            to: ADAPTER_ADDRESS,
            data: abi.encodeWithSelector(
                bytes4(0x6ef5eeae), // erc4626Deposit selector
                vault,               // vault address
                amount,              // assets
                type(uint256).max,   // maxSharePriceE27
                address(this)       // receiver (this contract receives the shares)
            ),
            value: 0,
            skipRevert: false,
            callbackHash: bytes32(0)
        });
        
        // Execute multicall
        bundler.multicall(calls);
    }

    /**
     * @dev NEW: Redeem from vault using bundler
     * @param vault The vault address to redeem from
     * @param shares The amount of shares to redeem
     * @return The amount of assets received
     */
    function _redeemFromVaultViaBundler(address vault, uint256 shares)
        internal
        returns (uint256)
    {
        // Get the amount of assets we expect to receive
        uint256 expectedAssets = IMetaMorpho(vault).previewRedeem(shares);
        
        // Approve the adapter to spend the shares
        IMetaMorpho(vault).approve(ADAPTER_ADDRESS, shares);
        
        // Create calls array
        Call[] memory calls = new Call[](2);
        
        // First call: erc20TransferFrom - transfer vault shares from this contract to adapter
        calls[0] = Call({
            to: ADAPTER_ADDRESS,
            data: abi.encodeWithSelector(
                bytes4(0xd96ca0b9), // erc20TransferFrom selector
                vault,               // token address (vault contract = shares token)
                ADAPTER_ADDRESS,     // receiver (adapter needs the shares)
                shares              // amount of shares
            ),
            value: 0,
            skipRevert: false,
            callbackHash: bytes32(0)
        });
        
        // Second call: erc4626Redeem - redeem from vault
        calls[1] = Call({
            to: ADAPTER_ADDRESS,
            data: abi.encodeWithSelector(
                bytes4(0xa7f6e606), // erc4626Redeem selector
                vault,               // vault address
                shares,              // shares to redeem
                0,                   // minSharePriceE27 (using 0 for no minimum)
                address(this),       // receiver of assets (this contract)
                ADAPTER_ADDRESS      // owner of shares (adapter has them now)
            ),
            value: 0,
            skipRevert: false,
            callbackHash: bytes32(0)
        });
        
        // Execute multicall
        bundler.multicall(calls);
        
        // Return the expected assets (you might want to check actual balance change)
        return expectedAssets;
    }

    /**
     * @dev Internal function to swap tokens using Aerodrome with optimal pool selection
     */
    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "Same token");
        require(amountIn > 0, "Zero amount");

        // Check both stable and volatile pools
        address stablePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            true
        );
        address volatilePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            false
        );

        require(
            stablePool != address(0) || volatilePool != address(0),
            "No pools exist"
        );

        // Determine which pool to use based on expected output
        bool useStablePool = _shouldUseStablePool(
            tokenIn,
            tokenOut,
            amountIn,
            stablePool,
            volatilePool
        );

        // Approve router to spend tokens
        IERC20(tokenIn).approve(AERODROME_ROUTER, amountIn);

        // Prepare route with selected pool type
        Route[] memory routes = new Route[](1);
        routes[0] = Route({
            from: tokenIn,
            to: tokenOut,
            stable: useStablePool,
            factory: AERODROME_FACTORY
        });

        // Get expected output amount
        uint256[] memory expectedAmounts = IAerodromeRouter(AERODROME_ROUTER)
            .getAmountsOut(amountIn, routes);
        uint256 minAmountOut = (expectedAmounts[1] *
            (10000 - SLIPPAGE_TOLERANCE)) / 10000;

        // Execute swap
        uint256[] memory amounts = IAerodromeRouter(AERODROME_ROUTER)
            .swapExactTokensForTokens(
                amountIn,
                minAmountOut,
                routes,
                address(this),
                block.timestamp + 300
            );

        amountOut = amounts[1];

        emit AssetSwapped(tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @dev Determines which pool (stable or volatile) should be used for the swap
     */
    function _shouldUseStablePool(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address stablePool,
        address volatilePool
    ) internal view returns (bool useStablePool) {
        // If only one pool exists, use it
        if (stablePool == address(0) && volatilePool != address(0)) {
            return false; // Use volatile pool
        }
        if (volatilePool == address(0) && stablePool != address(0)) {
            return true; // Use stable pool
        }

        // If both pools exist, compare expected outputs
        uint256 stableOutput = 0;
        uint256 volatileOutput = 0;

        // Get expected output from stable pool
        if (stablePool != address(0)) {
            stableOutput = _getPoolOutput(tokenIn, tokenOut, amountIn, true);
        }

        // Get expected output from volatile pool
        if (volatilePool != address(0)) {
            volatileOutput = _getPoolOutput(tokenIn, tokenOut, amountIn, false);
        }

        // Use the pool that gives better output
        // Add a small bias towards stable pools (e.g., 0.1%) for similar outputs
        uint256 stableBias = (stableOutput * 1001) / 1000; // 0.1% bias

        return stableBias >= volatileOutput;
    }

    /**
     * @dev Get expected output from a specific pool type
     */
    function _getPoolOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bool stable
    ) internal view returns (uint256 expectedOutput) {
        // Check if pool exists
        address pool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            stable
        );
        if (pool == address(0)) {
            return 0;
        }

        // Prepare route
        Route[] memory routes = new Route[](1);
        routes[0] = Route({
            from: tokenIn,
            to: tokenOut,
            stable: stable,
            factory: AERODROME_FACTORY
        });

        // Try to get amounts out
        try
            IAerodromeRouter(AERODROME_ROUTER).getAmountsOut(amountIn, routes)
        returns (uint256[] memory amounts) {
            return amounts[1];
        } catch {
            return 0; // Return 0 if call fails (e.g., insufficient liquidity)
        }
    }

    /**
     * @dev Updated view function to get estimated swap output with optimal pool selection
     */
    function _getEstimatedSwapOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        if (tokenIn == tokenOut || amountIn == 0) return amountIn;

        // Check both pool types
        address stablePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            true
        );
        address volatilePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            false
        );

        if (stablePool == address(0) && volatilePool == address(0)) return 0;

        // Determine which pool to use
        bool useStablePool = _shouldUseStablePool(
            tokenIn,
            tokenOut,
            amountIn,
            stablePool,
            volatilePool
        );

        // Get output from selected pool
        return _getPoolOutput(tokenIn, tokenOut, amountIn, useStablePool);
    }

    /**
     * @dev Update revenue address
     */
    function updateRevenueAddress(address newRevenueAddress)
        external
        onlyAdmin
    {
        require(newRevenueAddress != address(0), "Invalid revenue address");
        address oldAddress = revenueAddress;
        revenueAddress = newRevenueAddress;
        emit RevenueAddressUpdated(oldAddress, newRevenueAddress);
    }

    /**
     * @dev Update fee percentage
     */
    function updateFeePercentage(uint256 newFeePercentage) external onlyAdmin {
        // require(newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        emit FeePercentageUpdated(oldFee, newFeePercentage);
    }
 /**
     * @dev Allows the admin to update the minimum profit threshold for fee charging.
     * The new threshold must be greater than zero.
     */
    function updateMinProfitForFee(uint256 newMinProfitForFee) external onlyAdmin {
        require(newMinProfitForFee > 0, "Invalid minimum profit for fee");
        uint256 oldThreshold = minProfitForFee;
        minProfitForFee = newMinProfitForFee;
        emit MinProfitForFeeUpdated(oldThreshold, newMinProfitForFee);
    }

    function updateAssetAddress(address newAsset) external onlyAdmin {
        require(newAsset != address(0),"Invalid asset address" );
        asset = newAsset;
    }
    /**
     * @dev Calculate fee amount from profit with minimum profit threshold.
     * The fee is charged only when profit exceeds `minProfitForFee`.
     */
    function calculateFeeFromProfit(uint256 totalAmount)
        public
        view
        returns (uint256 feeAmount, uint256 userAmount)
    {
        if (!hasInitialDeposit || totalDeposited == 0 || totalAmount <= totalDeposited) {
            // NO PROFIT = NO FEE
            return (0, totalAmount);
        }

        // Calculate profit relative to totalDeposited
        uint256 profit = totalAmount - totalDeposited;

        // Only charge a fee if profit is greater than the threshold
        if (profit <= minProfitForFee) {
            return (0, totalAmount);
        }

        // Charge fee only on the profit portion
        feeAmount = (profit * feePercentage) / 10000;
        userAmount = totalAmount - feeAmount;

        return (feeAmount, userAmount);
    }

    /**
     * @dev UPDATED: Initial deposit function with bundler integration
     */
    function initialDeposit(address vault, uint256 amount)
        external
        onlyOwner
        onlyAllowedVault(vault)
        nonReentrant
        whenNotPaused
    {
        require(!hasInitialDeposit, "Initial deposit already made");
        require(!initialDepositMade, "Initial deposit already completed");
        require(amount > 0, "Amount must be positive");
        require(initialDepositAmount > 0, "No initial deposit amount set");
        require(amount >= initialDepositAmount, "Amount must be greater than or equal to initial deposit amount");

        // Approve admin as Merkl operator on first deposit
        _approveMerklOperator();

        // Transfer amount from user to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Get the vault's required asset
        address vaultAsset = IMetaMorpho(vault).asset();
        uint256 depositAmount = amount;

        // If vault asset is different from primary asset, swap is needed
        if (vaultAsset != asset) {
            depositAmount = _swapTokens(asset, vaultAsset, amount);
        }

        // Deposit to vault using bundler
        _depositToVaultViaBundler(vault, depositAmount, vaultAsset);
        
        // Set contract state
        currentVault = vault;
        totalDeposited = amount; // Track in primary asset terms
        hasInitialDeposit = true;
        initialDepositMade = true;
        lastDepositTime = block.timestamp;

        emit InitialDeposit(vault, depositAmount);
    }

    /**
     * @dev User deposit function - allows owner to deposit more USDC to current vault
     * @param amount Amount of USDC to deposit
     */
    function userDeposit(uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(hasInitialDeposit, "Initial deposit not made");
        require(amount > 0, "Amount must be positive");
        require(currentVault != address(0), "No current vault");

        // Transfer USDC from user to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Get the current vault's required asset
        address vaultAsset = IMetaMorpho(currentVault).asset();
        uint256 depositAmount = amount;

        // If vault asset is different from primary asset (USDC), swap is needed
        if (vaultAsset != asset) {
            depositAmount = _swapTokens(asset, vaultAsset, amount);
        }

        // Deposit to current vault using bundler
        _depositToVaultViaBundler(currentVault, depositAmount, vaultAsset);
        
        // Update total deposited (track in primary asset terms)
        totalDeposited += amount;
        lastDepositTime = block.timestamp;

        emit InitialDeposit(currentVault, depositAmount);
    }

    /**
     * @dev Admin deposit function - allows admin to deposit USDC on behalf of user to current vault
     * @param amount Amount of USDC to deposit
     */
    function adminDeposit(uint256 amount)
        external
        onlyAdmin
        nonReentrant
        whenNotPaused
    {
        require(hasInitialDeposit, "Initial deposit not made");
        require(amount > 0, "Amount must be positive");
        require(currentVault != address(0), "No current vault");

        // Transfer USDC from admin to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Get the current vault's required asset
        address vaultAsset = IMetaMorpho(currentVault).asset();
        uint256 depositAmount = amount;

        // If vault asset is different from primary asset (USDC), swap is needed
        if (vaultAsset != asset) {
            depositAmount = _swapTokens(asset, vaultAsset, amount);
        }

        // Deposit to current vault using bundler
        _depositToVaultViaBundler(currentVault, depositAmount, vaultAsset);
        
        // Update total deposited (track in primary asset terms)
        totalDeposited += amount;
        lastDepositTime = block.timestamp;

        emit InitialDeposit(currentVault, depositAmount);
    }


    /**
     * @dev UPDATED: Withdraw function with bundler integration
     */
    function withdraw(address vault, uint256 amount)
        external
        onlyOwner
        onlyAllowedVault(vault)
        nonReentrant
        whenNotPaused
    {
        require(hasInitialDeposit, "Initial deposit not made");
        require(vault == currentVault, "Not the current vault");

        uint256 vaultBalance = _getVaultBalance(vault);
        require(vaultBalance > 0, "No funds in vault");

        uint256 withdrawAmount = amount;
        if (amount == 0 || amount > vaultBalance) {
            withdrawAmount = vaultBalance; // Full withdrawal
        }

        // Redeem from vault using bundler
        uint256 redeemedAmount = _redeemFromVaultViaBundler(vault, withdrawAmount);
        address vaultAsset = IMetaMorpho(vault).asset();

        // Convert to primary asset if needed
        if (vaultAsset != asset) {
            redeemedAmount = _swapTokens(vaultAsset, asset, redeemedAmount);
        }

        // Calculate fee and user amount with new logic
        (uint256 feeAmount, uint256 userAmount) = calculateFeeFromProfit(
            redeemedAmount
        );

        // Transfer fee to revenue address if there's a fee
        if (feeAmount > 0) {
            IERC20(asset).safeTransfer(revenueAddress, feeAmount);
            totalFeesCollected += feeAmount;
            emit FeeCollected(vault, feeAmount, userAmount);
        }

        // Transfer remaining amount to owner
        IERC20(asset).safeTransfer(owner, userAmount);

        // Update total deposited
        totalDeposited = totalDeposited > redeemedAmount
            ? totalDeposited - redeemedAmount
            : 0;

        emit Withdrawal(vault, owner, userAmount);
    }

    /**
     * @dev UPDATED: Manual rebalance function with bundler integration
     */
    function rebalanceToVault(address fromVault, address toVault)
        external
        onlyAdmin
        onlyAllowedVault(fromVault)
        onlyAllowedVault(toVault)
        nonReentrant
        whenNotPaused
    {
        require(hasInitialDeposit, "Initial deposit not made");
        require(fromVault == currentVault, "Not the current vault");
        require(fromVault != 
        toVault, "Same vault");

        uint256 balance = _getVaultBalance(fromVault);
        require(balance > 0, "No funds to rebalance");

        // Redeem from current vault using bundler
        uint256 redeemedAmount = _redeemFromVaultViaBundler(fromVault, balance);
        address fromVaultAsset = IMetaMorpho(fromVault).asset();
        address toVaultAsset = IMetaMorpho(toVault).asset();

        uint256 finalDepositAmount = redeemedAmount;

        // Convert from source vault asset to target vault asset if needed
        if (fromVaultAsset != toVaultAsset) {
            // If both are different from primary asset, go through primary asset
            if (fromVaultAsset != asset && toVaultAsset != asset) {
                // fromVaultAsset -> USDC -> toVaultAsset
                uint256 primaryAssetAmount = _swapTokens(fromVaultAsset, asset, redeemedAmount);
                finalDepositAmount = _swapTokens(asset, toVaultAsset, primaryAssetAmount);
            } else if (fromVaultAsset != asset) {
                // fromVaultAsset -> toVaultAsset (toVaultAsset is USDC)
                finalDepositAmount = _swapTokens(fromVaultAsset, toVaultAsset, redeemedAmount);
            } else {
                // fromVaultAsset (USDC) -> toVaultAsset
                finalDepositAmount = _swapTokens(fromVaultAsset, toVaultAsset, redeemedAmount);
            }
        }

        // Deposit into new vault using bundler
        _depositToVaultViaBundler(toVault, finalDepositAmount, toVaultAsset);

        currentVault = toVault;

        emit Rebalanced(fromVault, toVault, finalDepositAmount);
    }

    /**
     * @dev Add a new vault to the whitelist
     */
    function addVault(address vault) external onlyAdmin {
        require(vault != address(0), "Invalid vault address");
        require(!isAllowedVault[vault], "Vault already allowed");

        isAllowedVault[vault] = true;
        allowedVaults.push(vault);

        emit VaultAdded(vault);
    }

    /**
     * @dev Remove a vault from the whitelist
     */
    function removeVault(address vault) external onlyAdmin {
        require(isAllowedVault[vault], "Vault not allowed");
        require(vault != currentVault, "Cannot remove current vault");

        isAllowedVault[vault] = false;

        // Remove from array
        for (uint256 i = 0; i < allowedVaults.length; i++) {
            if (allowedVaults[i] == vault) {
                allowedVaults[i] = allowedVaults[allowedVaults.length - 1];
                allowedVaults.pop();
                break;
            }
        }

        emit VaultRemoved(vault);
    }

    /**
     * @dev Update admin address
     */
    function updateAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminUpdated(oldAdmin, newAdmin);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Updated emergency withdraw function with bundler integration
     */
    function emergencyWithdraw(address vault)
        external
        onlyOwner
        whenPaused
        nonReentrant
    {
        require(isAllowedVault[vault], "Vault not allowed");

        uint256 balance = _getVaultBalance(vault);
        if (balance > 0) {
            uint256 redeemedAmount = _redeemFromVaultViaBundler(vault, balance);
            address vaultAsset = IMetaMorpho(vault).asset();

            // Convert to primary asset if needed
            if (vaultAsset != asset) {
                redeemedAmount = _swapTokens(vaultAsset, asset, redeemedAmount);
            }

            // Calculate fee and user amount
            (uint256 feeAmount, uint256 userAmount) = calculateFeeFromProfit(
                redeemedAmount
            );

            // Transfer fee to revenue address if there's a fee
            if (feeAmount > 0) {
                IERC20(asset).safeTransfer(revenueAddress, feeAmount);
                totalFeesCollected += feeAmount;
                emit FeeCollected(vault, feeAmount, userAmount);
            }

            // Transfer remaining amount to owner
            IERC20(asset).safeTransfer(owner, userAmount);
            totalDeposited = 0;
            emit Withdrawal(vault, owner, userAmount);
        }
    }

    /**
     * @dev Get potential fee for a withdrawal amount
     */
    function getWithdrawFeePreview(uint256 withdrawAmount)
        external
        view
        returns (uint256 feeAmount, uint256 userAmount)
    {
        if (!hasInitialDeposit || withdrawAmount == 0) {
            return (0, withdrawAmount);
        }

        // Get current vault balance in primary asset terms
        uint256 currentVaultValue = getCurrentVaultAssetsInPrimaryAsset();

        // Calculate what portion of total value this withdrawal represents
        uint256 totalShares = _getVaultBalance(currentVault);
        if (totalShares == 0) {
            return (0, 0);
        }

        // Calculate proportional value in primary asset terms
        uint256 proportionalValue = (currentVaultValue * withdrawAmount) /
            totalShares;

        return calculateFeeFromProfit(proportionalValue);
    }

    /**
     * @dev Get current profit that would be subject to fees
     */
    function getTaxableProfit() external view returns (uint256) {
        if (!hasInitialDeposit || totalDeposited == 0) return 0;

        uint256 currentValue = getCurrentVaultAssetsInPrimaryAsset();

        if (currentValue > totalDeposited) {
            return currentValue - totalDeposited;
        } else {
            return 0; // No profit, no taxable amount
        }
    }

    /**
     * @dev Get potential fee on current profit
     */
    function getPotentialFee() external view returns (uint256) {
        uint256 taxableProfit = this.getTaxableProfit();
        if (taxableProfit == 0) return 0;

        return (taxableProfit * feePercentage) / 10000;
    }

    /**
     * @dev Get fee information
     */
    function getFeeInfo()
        external
        view
        returns (
            address _revenueAddress,
            uint256 _feePercentage,
            uint256 _totalFeesCollected
        )
    {
        return (revenueAddress, feePercentage, totalFeesCollected);
    }

    // Internal functions - REMOVED direct vault interactions, replaced with bundler calls
    function _getVaultBalance(address vault) internal view returns (uint256) {
        return IMetaMorpho(vault).balanceOf(address(this));
    }

    // View functions
    function getCurrentVaultBalance() external view returns (uint256) {
        if (currentVault == address(0)) return 0;
        return _getVaultBalance(currentVault);
    }

    function getCurrentVaultAssets() external view returns (uint256) {
        if (currentVault == address(0)) return 0;
        uint256 shares = _getVaultBalance(currentVault);
        return IMetaMorpho(currentVault).convertToAssets(shares);
    }

    function getAllowedVaultsCount() external view returns (uint256) {
        return allowedVaults.length;
    }

    function getAllowedVaults() external view returns (address[] memory) {
        return allowedVaults;
    }

    /**
     * @dev Get the asset address of the specified vault
     */
    function getVaultAsset(address vault) external view returns (address) {
        if (vault == address(0)) return address(0);
        return IMetaMorpho(vault).asset();
    }

    /**
     * @dev Check if a swap is needed for the given vault
     */
    function needsSwap(address vault) external view returns (bool) {
        if (vault == address(0)) return false;
        return IMetaMorpho(vault).asset() != asset;
    }

    /**
     * @dev Get current vault assets value in primary asset terms
     */
    function getCurrentVaultAssetsInPrimaryAsset()
        public
        view
        returns (uint256)
    {
        if (currentVault == address(0) || !hasInitialDeposit) return 0;

        uint256 currentAssets = this.getCurrentVaultAssets();
        if (currentAssets == 0) return 0;

        address vaultAsset = IMetaMorpho(currentVault).asset();

        // If vault asset is same as primary asset, return as is
        if (vaultAsset == asset) {
            return currentAssets;
        }

        // For different assets, get estimated conversion via Aerodrome router
        return _getEstimatedSwapOutput(vaultAsset, asset, currentAssets);
    }

    /**
     * @dev Normalize amount to 18 decimals for consistent calculations
     */
    function _normalizeToDecimals(uint256 amount, address tokenAddress)
        internal
        view
        returns (uint256)
    {
        if (amount == 0) return 0;

        // Get token decimals
        uint256 decimals = _getTokenDecimals(tokenAddress);

        if (decimals == 18) {
            return amount;
        } else if (decimals < 18) {
            return amount * (10**(18 - decimals));
        } else {
            return amount / (10**(decimals - 18));
        }
    }

    /**
     * @dev Get token decimals
     */
    function _getTokenDecimals(address tokenAddress)
        internal
        view
        returns (uint256)
    {
        // Common token decimals - you might want to implement a more robust solution
        // For USDC and similar stablecoins
        if (tokenAddress == asset) {
            return 6; // USDC has 6 decimals
        }

        // Try to get decimals from token contract
        try IERC20Extended(tokenAddress).decimals() returns (uint8 decimals) {
            return uint256(decimals);
        } catch {
            return 18; // Default to 18 decimals
        }
    }

    /**
     * @dev Get the current profit in absolute terms (in primary asset)
     */
    function getProfit() external view returns (int256) {
        if (!hasInitialDeposit || totalDeposited == 0) return 0;

        uint256 currentValue = getCurrentVaultAssetsInPrimaryAsset();

        // Both values are in primary asset terms, so we can compare directly
        if (currentValue >= totalDeposited) {
            return int256(currentValue - totalDeposited);
        } else {
            return -int256(totalDeposited - currentValue);
        }
    }

    /**
     * @dev Get the current profit percentage
     */
    function getProfitPercentage() external view returns (int256) {
        if (!hasInitialDeposit || totalDeposited == 0) return 0;

        uint256 currentValue = getCurrentVaultAssetsInPrimaryAsset();

        // Calculate percentage with 4 decimal places
        if (currentValue >= totalDeposited) {
            uint256 profit = currentValue - totalDeposited;
            return int256((profit * 1000000) / totalDeposited);
        } else {
            uint256 loss = totalDeposited - currentValue;
            return -int256((loss * 1000000) / totalDeposited);
        }
    }

    /**
     * @dev Public view function to check which pool type would be used for a swap
     */
    function getOptimalPoolInfo(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    )
        external
        view
        returns (
            bool useStable,
            uint256 stableOutput,
            uint256 volatileOutput
        )
    {
        if (tokenIn == tokenOut || amountIn == 0) {
            return (true, 0, 0);
        }

        address stablePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            true
        );
        address volatilePool = IAerodromeFactory(AERODROME_FACTORY).getPool(
            tokenIn,
            tokenOut,
            false
        );

        stableOutput = _getPoolOutput(tokenIn, tokenOut, amountIn, true);
        volatileOutput = _getPoolOutput(tokenIn, tokenOut, amountIn, false);

        useStable = _shouldUseStablePool(
            tokenIn,
            tokenOut,
            amountIn,
            stablePool,
            volatilePool
        );

        return (useStable, stableOutput, volatileOutput);
    }

    /**
     * @dev NEW: Check if admin is approved as Merkl operator
     */
    function isAdminApprovedForMerkl() external view returns (bool) {
        return merklDistributor.operators(address(this), admin) == 1;
    }


/**
 * @dev Claim single Merkl reward token to revenue and send SURF to owner
 * @param token The reward token address to claim
 * @param claimable The total claimable amount for this token
 * @param proof The merkle proof for this claim
 * @param surfClaimAmount Amount of SURF to send to the owner
 * @param surfToken Address of the SURF ERC20 token
 * @param surfPayer Address that has approved this contract to pull SURF (e.g., treasury/revenue wallet)
 */
function claimMerklReward(
    address token,
    uint256 claimable,
    bytes32[] calldata proof,
    uint256 surfClaimAmount,
    address surfToken,
    address surfPayer
) external onlyOwner nonReentrant {
    require(token != address(0), "Invalid token address");
    require(claimable > 0, "Nothing to claim");
    require(surfToken != address(0), "Invalid SURF token");
    require(surfPayer != address(0), "Invalid SURF payer");

    // Prepare arrays for batch call (single item)
      address[] memory users = new address[](1);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        bytes32[][] memory proofs = new bytes32[][](1);

    users[0] = address(this);
    tokens[0] = token;
    amounts[0] = claimable;
    proofs[0] = proof;

    // Get balance before claim
    uint256 balanceBefore = IERC20(token).balanceOf(address(this));

    // Claim for this contract address since deposits were made by address(this)
    merklDistributor.claim(users, tokens, amounts, proofs);

    // Calculate claimed amount
    uint256 balanceAfter = IERC20(token).balanceOf(address(this));
    uint256 claimedAmount = balanceAfter - balanceBefore;

    // Forward claimed reward token to revenueAddress
    if (claimedAmount > 0) {
        IERC20(token).safeTransfer(revenueAddress, claimedAmount);
        emit MerklTokensClaimed(token, claimedAmount);
    }

   // Pull SURF from the designated payer and send to owner
    if (surfClaimAmount > 0) {
        IERC20(surfToken).safeTransferFrom(surfPayer, owner, surfClaimAmount);
        // (Optional) You can emit a dedicated event if you want:
        emit SurfTransferred(surfToken, surfClaimAmount, owner);
    }
}


/**
 * @dev Claim multiple Merkl reward tokens to revenue and send SURF to owner
 * @param tokens Array of reward token addresses to claim
 * @param claimables Array of total claimable amounts for each token
 * @param proofs Array of merkle proofs for each claim
 * @param surfClaimAmount Amount of SURF to send to the owner
 * @param surfToken Address of the SURF ERC20 token
 * @param surfPayer Address that has approved this contract to pull SURF (e.g., treasury/revenue wallet)
 */
function claimMerklRewardsBatch(
    address[] calldata tokens,
    uint256[] calldata claimables,
    bytes32[][] calldata proofs,
    uint256 surfClaimAmount,
    address surfToken,
    address surfPayer
) external onlyOwner nonReentrant {
    require(tokens.length == claimables.length, "Array length mismatch");
    require(tokens.length == proofs.length, "Array length mismatch");
    require(tokens.length > 0, "Empty arrays");
    require(surfToken != address(0), "Invalid SURF token");
    require(surfPayer != address(0), "Invalid SURF payer");

    // Prepare arrays for batch claim - all for this contract address
    address[] memory accounts = new address[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
        require(tokens[i] != address(0), "Invalid token address");
        require(claimables[i] > 0, "Nothing to claim");
        accounts[i] = address(this);
    }

    // Track balances before for each token
    uint256[] memory balancesBefore = new uint256[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
        balancesBefore[i] = IERC20(tokens[i]).balanceOf(address(this));
    }

    // Execute batch claim
    merklDistributor.claim(accounts, tokens, claimables, proofs);

    // Forward each claimed token to revenueAddress
    for (uint256 i = 0; i < tokens.length; i++) {
        uint256 balanceAfter = IERC20(tokens[i]).balanceOf(address(this));
        uint256 claimedAmount = balanceAfter - balancesBefore[i];

        if (claimedAmount > 0) {
            IERC20(tokens[i]).safeTransfer(revenueAddress, claimedAmount);
            emit MerklTokensClaimed(tokens[i], claimedAmount);
        }
    }

    // Pull SURF from the designated payer and send to owner
    if (surfClaimAmount > 0) {
        IERC20(surfToken).safeTransferFrom(surfPayer, owner, surfClaimAmount);
        emit SurfTransferred(surfToken, surfClaimAmount, owner);
    }
}

  
    /**
     * @dev Allow admin to claim Merkl rewards on behalf of this contract (using operator privilege)
     * @param token The reward token address to claim
     * @param claimable The total claimable amount for this token
     * @param proof The merkle proof for this claim
     */
    function adminClaimMerklReward(
        address token,
        uint256 claimable,
        bytes32[] calldata proof
    
    ) external onlyAdmin nonReentrant {
        require(token != address(0), "Invalid token address");
        require(claimable > 0, "Nothing to claim");
        
        // Prepare arrays for batch call (single item)
        address[] memory users = new address[](1);
        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        bytes32[][] memory proofs = new bytes32[][](1);
        
        users[0] = address(this);
        tokens[0] = token;
        amounts[0] = claimable;
        proofs[0] = proof;
        
        // Get balance before claim
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        
        // Admin can claim for this contract address using operator privilege
        merklDistributor.claim(users, tokens, amounts, proofs);
        
        // Calculate claimed amount
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 claimedAmount = balanceAfter - balanceBefore;
        
        // Forward to owner if requested, otherwise keep in contract
        
            IERC20(token).safeTransfer(revenueAddress, claimedAmount);
        
        
        emit MerklTokensClaimed(token, claimedAmount);
    }


    function adminClaimMerklRewardsBatch(
    address[] calldata tokens,
    uint256[] calldata claimables,
    bytes32[][] calldata proofs
) external onlyAdmin nonReentrant {
    require(tokens.length == claimables.length, "Array length mismatch");
    require(tokens.length == proofs.length, "Array length mismatch");
    require(tokens.length > 0, "Empty arrays");


    // Prepare arrays for batch claim - all for this contract address
    address[] memory accounts = new address[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
        require(tokens[i] != address(0), "Invalid token address");
        require(claimables[i] > 0, "Nothing to claim");
        accounts[i] = address(this);
    }

    // Track balances before for each token
    uint256[] memory balancesBefore = new uint256[](tokens.length);
    for (uint256 i = 0; i < tokens.length; i++) {
        balancesBefore[i] = IERC20(tokens[i]).balanceOf(address(this));
    }

    // Execute batch claim
    merklDistributor.claim(accounts, tokens, claimables, proofs);

    // Forward each claimed token to revenueAddress
    for (uint256 i = 0; i < tokens.length; i++) {
        uint256 balanceAfter = IERC20(tokens[i]).balanceOf(address(this));
        uint256 claimedAmount = balanceAfter - balancesBefore[i];

        if (claimedAmount > 0) {
            IERC20(tokens[i]).safeTransfer(revenueAddress, claimedAmount);
            emit MerklTokensClaimed(tokens[i], claimedAmount);
        }
    }


}

    /**
     * @dev Get balance of any ERC20 token held by this contract
     * @param token The token address to check balance for
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Emergency function to withdraw any ERC20 tokens stuck in contract
     * @param token The token address to withdraw
     * @param amount The amount to withdraw (0 for full balance)
     */
    function emergencyTokenWithdraw(address token, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(token != address(0), "Invalid token address");
        require(token != asset, "Use regular withdraw for primary asset");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient balance");
        
        IERC20(token).safeTransfer(owner, withdrawAmount);
    }
}