// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";
import {LibGvPayment} from "../libraries/LibGvPayment.sol";

/// @notice Permissionless soft-install craft for registered ids in [162,215] and decor (L1+1000).
/// @dev TEMPORARY bag: mints into GV diamond ERC1155 balances (disjoint from tiles 8–47).
///      Decor uses ids L1+1000 so type-7 never shares balance slots with soft tiles.
///      Locked SoT = Aarcade cartridge ERC1155. Cartridge InventoryFacet currently has no
///      soft-install mint (only mintWearable) — bridge/mint-into-cartridge is the next slice.
///      paymentEnabled: optional alchemica pull (when tokens set) + optional USDC LineBMint.
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
                LibGvPayment.pullAlchemica(s, msg.sender, t.cost, amount);
                LibGvPayment.payLineBMint(
                    s,
                    msg.sender,
                    LibGvPayment.poolForSoftInstall(),
                    amount,
                    LibGvPayment.refFor(msg.sender, id, amount)
                );
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

    /// @notice USDC LineBMint fee for `amount` soft installs (0 if lineB fee off / unset).
    function quoteCraftLineBFeeUsdc(uint256 amount) external view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (!s.paymentEnabled || !s.lineBFeeEnabled || s.safeFeeRouter == address(0)) return 0;
        return s.lineBMintFeeUsdc * amount;
    }
}
