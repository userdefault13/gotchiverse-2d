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
