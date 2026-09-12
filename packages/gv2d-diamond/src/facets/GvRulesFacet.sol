// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";

/// @notice Mutable game/economy rules — costs and payment flags live here, not in immutables.
contract GvRulesFacet {
    event RulesInitialized(uint256 rulesVersion);
    event PaymentEnabledSet(bool enabled);
    event AlchemicaTokensSet(address fud, address fomo, address alpha, address kek);
    event GhostDefaultCostSet(uint256 fud, uint256 fomo, uint256 alpha, uint256 kek);
    event TileRegistered(uint256 indexed tileId, uint256 fud, uint256 fomo, uint256 alpha, uint256 kek);
    event TileCostUpdated(uint256 indexed tileId, uint256 fud, uint256 fomo, uint256 alpha, uint256 kek);
    event RulesVersionBumped(uint256 rulesVersion);
    event TileCooldownParamsSet(uint256 bandStep, uint256 firstCooldownSeconds, uint256 maxCapSeconds);
    event SafeFeeRouterSet(address router);
    event UsdcSet(address usdc);
    event LineBFeeEnabledSet(bool enabled);
    event LineBMintFeeUsdcSet(uint256 feeUsdc);
    event LineBPublisherSet(address publisher);

    function initGvRules(
        address[4] calldata alchemicaTokens_,
        LibAppStorage.AlchemicaCost calldata ghostDefaultCost_,
        bool paymentEnabled_
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(!s.initialized, "GvRules: init");
        s.alchemicaTokens = alchemicaTokens_;
        s.ghostDefaultCost = ghostDefaultCost_;
        s.paymentEnabled = paymentEnabled_;
        s.rulesVersion = 1;
        s.initialized = true;
        emit RulesInitialized(1);
        emit PaymentEnabledSet(paymentEnabled_);
        emit AlchemicaTokensSet(
            alchemicaTokens_[0], alchemicaTokens_[1], alchemicaTokens_[2], alchemicaTokens_[3]
        );
        emit GhostDefaultCostSet(
            ghostDefaultCost_.fud,
            ghostDefaultCost_.fomo,
            ghostDefaultCost_.alpha,
            ghostDefaultCost_.kek
        );
    }

    function setPaymentEnabled(bool enabled) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.paymentEnabled = enabled;
        s.rulesVersion += 1;
        emit PaymentEnabledSet(enabled);
        emit RulesVersionBumped(s.rulesVersion);
    }

    function setAlchemicaTokens(address[4] calldata tokens) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.alchemicaTokens = tokens;
        s.rulesVersion += 1;
        emit AlchemicaTokensSet(tokens[0], tokens[1], tokens[2], tokens[3]);
        emit RulesVersionBumped(s.rulesVersion);
    }

    function setGhostDefaultCost(LibAppStorage.AlchemicaCost calldata cost) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.ghostDefaultCost = cost;
        s.rulesVersion += 1;
        emit GhostDefaultCostSet(cost.fud, cost.fomo, cost.alpha, cost.kek);
        emit RulesVersionBumped(s.rulesVersion);
    }

    function registerTile(uint256 tileId, LibAppStorage.AlchemicaCost calldata cost) external {
        LibDiamond.enforceIsContractOwner();
        require(LibAppStorage.isSoftTileId(tileId), "GvRules: id range");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.tileRegistered[tileId] = true;
        s.tileCost[tileId] = cost;
        emit TileRegistered(tileId, cost.fud, cost.fomo, cost.alpha, cost.kek);
    }

    function registerTiles(uint256[] calldata tileIds, LibAppStorage.AlchemicaCost[] calldata costs)
        external
    {
        LibDiamond.enforceIsContractOwner();
        require(tileIds.length == costs.length, "GvRules: len");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < tileIds.length; i++) {
            uint256 tileId = tileIds[i];
            require(LibAppStorage.isSoftTileId(tileId), "GvRules: id range");
            s.tileRegistered[tileId] = true;
            s.tileCost[tileId] = costs[i];
            emit TileRegistered(
                tileId, costs[i].fud, costs[i].fomo, costs[i].alpha, costs[i].kek
            );
        }
    }

    function setTileCost(uint256 tileId, LibAppStorage.AlchemicaCost calldata cost) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.tileRegistered[tileId], "GvRules: !registered");
        s.tileCost[tileId] = cost;
        s.rulesVersion += 1;
        emit TileCostUpdated(tileId, cost.fud, cost.fomo, cost.alpha, cost.kek);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Tune soft-tile progressive craft cooldowns (band step / first CD / optional max).
    /// @dev band sizes = step, 2*step, 3*step, …; band0 CD=0; band k (k≥1) = first * 2^(k-1), capped.
    ///      Pass 0 for bandStep or firstCooldownSeconds to restore facet defaults (10 / 1 hour).
    ///      maxCapSeconds 0 = uncapped.
    function setTileCooldownParams(uint256 bandStep, uint256 firstCooldownSeconds, uint256 maxCapSeconds)
        external
    {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.tileCooldownBandStep = bandStep;
        s.tileFirstCooldownSeconds = firstCooldownSeconds;
        s.tileCooldownMaxSeconds = maxCapSeconds;
        s.rulesVersion += 1;
        emit TileCooldownParamsSet(bandStep, firstCooldownSeconds, maxCapSeconds);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Raw stored cooldown tunables (0 bandStep/first = facet defaults at read time).
    function tileCooldownParams()
        external
        view
        returns (uint256 bandStep, uint256 firstCooldownSeconds, uint256 maxCapSeconds)
    {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return (s.tileCooldownBandStep, s.tileFirstCooldownSeconds, s.tileCooldownMaxSeconds);
    }

    // -------------------------------------------------------------------------
    // SafeFeeRouter LineBMint (USDC) — splits remain SoT on the router
    // -------------------------------------------------------------------------

    /// @notice Point at Aarcade SafeFeeRouter (LineBMint 40/40/10/10). Does not enable fees.
    function setSafeFeeRouter(address router) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.safeFeeRouter = router;
        s.rulesVersion += 1;
        emit SafeFeeRouterSet(router);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Optional USDC cache. address(0) => read ISafeFeeRouter(safeFeeRouter).usdc().
    function setUsdc(address usdc_) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.usdc = usdc_;
        s.rulesVersion += 1;
        emit UsdcSet(usdc_);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Toggle USDC LineBMint collection (also requires paymentEnabled + fee > 0 + router).
    function setLineBFeeEnabled(bool enabled) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.lineBFeeEnabled = enabled;
        s.rulesVersion += 1;
        emit LineBFeeEnabledSet(enabled);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Per-unit USDC (6 decimals) LineBMint protocol fee. 0 = skip USDC leg.
    function setLineBMintFeeUsdc(uint256 feeUsdc) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.lineBMintFeeUsdc = feeUsdc;
        s.rulesVersion += 1;
        emit LineBMintFeeUsdcSet(feeUsdc);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Publisher for LineBMint publisher leg (bps=0 on default split; usually address(0)).
    function setLineBPublisher(address publisher) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.lineBPublisher = publisher;
        s.rulesVersion += 1;
        emit LineBPublisherSet(publisher);
        emit RulesVersionBumped(s.rulesVersion);
    }

    /// @notice Configure Line B wiring in one call (does not flip paymentEnabled).
    function configureLineBPayment(
        address router,
        address usdc_,
        uint256 feeUsdc,
        bool lineBEnabled,
        address publisher
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.safeFeeRouter = router;
        s.usdc = usdc_;
        s.lineBMintFeeUsdc = feeUsdc;
        s.lineBFeeEnabled = lineBEnabled;
        s.lineBPublisher = publisher;
        s.rulesVersion += 1;
        emit SafeFeeRouterSet(router);
        emit UsdcSet(usdc_);
        emit LineBMintFeeUsdcSet(feeUsdc);
        emit LineBFeeEnabledSet(lineBEnabled);
        emit LineBPublisherSet(publisher);
        emit RulesVersionBumped(s.rulesVersion);
    }

    function safeFeeRouter() external view returns (address) {
        return LibAppStorage.appStorage().safeFeeRouter;
    }

    function usdc() external view returns (address) {
        return LibAppStorage.appStorage().usdc;
    }

    function lineBFeeEnabled() external view returns (bool) {
        return LibAppStorage.appStorage().lineBFeeEnabled;
    }

    function lineBMintFeeUsdc() external view returns (uint256) {
        return LibAppStorage.appStorage().lineBMintFeeUsdc;
    }

    function lineBPublisher() external view returns (address) {
        return LibAppStorage.appStorage().lineBPublisher;
    }

    function paymentEnabled() external view returns (bool) {
        return LibAppStorage.appStorage().paymentEnabled;
    }

    function alchemicaTokens() external view returns (address[4] memory) {
        return LibAppStorage.appStorage().alchemicaTokens;
    }

    function ghostDefaultCost() external view returns (LibAppStorage.AlchemicaCost memory) {
        return LibAppStorage.appStorage().ghostDefaultCost;
    }

    function tileCost(uint256 tileId) external view returns (LibAppStorage.AlchemicaCost memory) {
        return LibAppStorage.appStorage().tileCost[tileId];
    }

    function isTileRegistered(uint256 tileId) external view returns (bool) {
        return LibAppStorage.appStorage().tileRegistered[tileId];
    }

    function rulesVersion() external view returns (uint256) {
        return LibAppStorage.appStorage().rulesVersion;
    }

    function softTileIdRange() external pure returns (uint256 start, uint256 end) {
        return (LibAppStorage.CTILE_ID_START, LibAppStorage.CTILE_ID_END);
    }
}
