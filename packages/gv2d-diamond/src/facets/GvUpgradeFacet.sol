// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";
import {LibGvPayment} from "../libraries/LibGvPayment.sol";

/// @notice Level-bump soft installs using catalog nextLevelId.
/// @dev Bag: burn L, mint L+1. Placed: swap placement.itemId in place (same footprint).
///      Upgrade cost = next level's catalog cost when paymentEnabled (zeros OK while off).
contract GvUpgradeFacet {
    event SoftInstallUpgradedInBag(
        address indexed account, uint256 indexed fromId, uint256 indexed toId, uint256 amount
    );
    event SoftInstallUpgradedPlacement(
        uint256 indexed placementId,
        address indexed owner,
        uint256 fromId,
        uint256 toId,
        bytes32 parcelId,
        uint16 x,
        uint16 y
    );

    /// @notice Upgrade `amount` of `fromId` held in caller's bag to catalog nextLevelId.
    function upgradeSoftInstallInBag(uint256 fromId, uint256 amount) external {
        require(amount > 0, "GvUpgrade: amount");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "GvUpgrade: !init");

        (uint256 toId, LibAppStorage.SoftInstallType storage nextT) = _resolveNext(s, fromId);
        require(s.balances[msg.sender][fromId] >= amount, "GvUpgrade: bal");

        if (s.paymentEnabled) {
            LibGvPayment.pullAlchemica(s, msg.sender, nextT.cost, amount);
            LibGvPayment.payLineBMint(
                s,
                msg.sender,
                LibGvPayment.poolForSoftInstall(),
                amount,
                LibGvPayment.refFor(msg.sender, toId, amount)
            );
        }

        LibERC1155.burn(msg.sender, fromId, amount);
        LibERC1155.mint(msg.sender, toId, amount);
        emit SoftInstallUpgradedInBag(msg.sender, fromId, toId, amount);
    }

    /// @notice Upgrade a placed soft install in place (placement.itemId → nextLevelId).
    /// @dev Footprint width/height must match next type (Lodge/Store/Cashier/Console bands do).
    function upgradeSoftInstallPlacement(uint256 placementId) external {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "GvUpgrade: !init");
        LibAppStorage.Placement storage p = s.placements[placementId];
        require(p.itemId != 0, "GvUpgrade: gone");
        require(p.owner == msg.sender, "GvUpgrade: !owner");

        uint256 fromId = p.itemId;
        (uint256 toId, LibAppStorage.SoftInstallType storage nextT) = _resolveNext(s, fromId);
        require(nextT.width == p.width && nextT.height == p.height, "GvUpgrade: size");

        if (s.paymentEnabled) {
            LibGvPayment.pullAlchemica(s, msg.sender, nextT.cost, 1);
            LibGvPayment.payLineBMint(
                s,
                msg.sender,
                LibGvPayment.poolForSoftInstall(),
                1,
                LibGvPayment.refFor(msg.sender, toId, 1)
            );
        }

        p.itemId = toId;
        emit SoftInstallUpgradedPlacement(placementId, msg.sender, fromId, toId, p.parcelId, p.x, p.y);
    }

    /// @notice Quote alchemica cost to upgrade one unit of fromId (next level's catalog cost).
    function quoteUpgradeCost(uint256 fromId)
        external
        view
        returns (LibAppStorage.AlchemicaCost memory total)
    {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        (, LibAppStorage.SoftInstallType storage nextT) = _resolveNext(s, fromId);
        total = nextT.cost;
    }

    function _resolveNext(LibAppStorage.AppStorage storage s, uint256 fromId)
        internal
        view
        returns (uint256 toId, LibAppStorage.SoftInstallType storage nextT)
    {
        require(LibAppStorage.isSoftInstallId(fromId), "GvUpgrade: id");
        LibAppStorage.SoftInstallType storage fromT = s.softInstalls[fromId];
        require(fromT.registered, "GvUpgrade: !registered");
        toId = fromT.nextLevelId;
        require(toId != 0, "GvUpgrade: max");
        require(LibAppStorage.isSoftInstallId(toId), "GvUpgrade: nextId");
        nextT = s.softInstalls[toId];
        require(nextT.registered, "GvUpgrade: !next");
    }

}
