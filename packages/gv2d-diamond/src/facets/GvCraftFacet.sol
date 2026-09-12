// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";
import {IERC20} from "../interfaces/IERC20.sol";

/// @notice Permissionless soft-install craft for registered ids in [162,215] and decor (L1+1000).
/// @dev TEMPORARY bag: mints into GV diamond ERC1155 balances (disjoint from tiles 8–47).
///      Decor uses ids L1+1000 so type-7 never shares balance slots with soft tiles.
///      Locked SoT = Aarcade cartridge ERC1155. Cartridge InventoryFacet currently has no
///      soft-install mint (only mintWearable) — bridge/mint-into-cartridge is the next slice.
///      Do not enable payment until Store/Lodge costs are locked.
contract GvCraftFacet {
    event InstallationsCrafted(address indexed to, uint256[] ids, uint256[] amounts);

    /// @notice Craft soft installs. Any EOA/contract may call. Invalid / unregistered ids revert.
    function craftInstallations(uint256[] calldata ids, uint256[] calldata amounts) external {
        require(ids.length == amounts.length, "GvCraft: len");
        require(ids.length > 0, "GvCraft: empty");

        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "GvCraft: !init");

        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            require(amount > 0, "GvCraft: amount");
            require(LibAppStorage.isSoftInstallId(id), "GvCraft: id");
            LibAppStorage.SoftInstallType storage t = s.softInstalls[id];
            require(t.registered, "GvCraft: !registered");

            if (s.paymentEnabled) {
                _pullCost(s, msg.sender, t.cost, amount);
            }
        }

        if (ids.length == 1) {
            LibERC1155.mint(msg.sender, ids[0], amounts[0]);
        } else {
            uint256[] memory idsMem = new uint256[](ids.length);
            uint256[] memory amtsMem = new uint256[](amounts.length);
            for (uint256 i; i < ids.length; i++) {
                idsMem[i] = ids[i];
                amtsMem[i] = amounts[i];
            }
            LibERC1155.mintBatch(msg.sender, idsMem, amtsMem);
        }

        emit InstallationsCrafted(msg.sender, ids, amounts);
    }

    function quoteCraftCost(uint256 id, uint256 amount)
        external
        view
        returns (LibAppStorage.AlchemicaCost memory total)
    {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(LibAppStorage.isSoftInstallId(id), "GvCraft: id");
        LibAppStorage.SoftInstallType storage t = s.softInstalls[id];
        require(t.registered, "GvCraft: !registered");
        total.fud = t.cost.fud * amount;
        total.fomo = t.cost.fomo * amount;
        total.alpha = t.cost.alpha * amount;
        total.kek = t.cost.kek * amount;
    }

    function _pullCost(
        LibAppStorage.AppStorage storage s,
        address from,
        LibAppStorage.AlchemicaCost memory unit,
        uint256 amount
    ) internal {
        _pullOne(s.alchemicaTokens[0], from, unit.fud * amount);
        _pullOne(s.alchemicaTokens[1], from, unit.fomo * amount);
        _pullOne(s.alchemicaTokens[2], from, unit.alpha * amount);
        _pullOne(s.alchemicaTokens[3], from, unit.kek * amount);
    }

    function _pullOne(address token, address from, uint256 amount) internal {
        if (amount == 0) return;
        require(token != address(0), "GvCraft: token");
        bool ok = IERC20(token).transferFrom(from, address(this), amount);
        require(ok, "GvCraft: transfer");
    }
}
