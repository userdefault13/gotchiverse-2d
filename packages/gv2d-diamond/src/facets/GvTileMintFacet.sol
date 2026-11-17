// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";
import {LibGvPayment} from "../libraries/LibGvPayment.sol";

/// @notice Permissionless soft-tile mint for ids [8,47]. No minter role.
/// @dev Credits diamond-hosted ERC1155 balances (TransferSingle from address(0)).
///      Progressive per-wallet, per-tileId soft craft cooldowns (Julius bands).
///      Replaces FE `craftCTileLocally`. Golden LE tiles 1–3 stay on the live Tile diamond.
contract GvTileMintFacet {
    event TilesMinted(address indexed to, uint256[] ids, uint256[] amounts);

    /// @notice Soft-tile craft still on cooldown for this wallet+tileId.
    error CooldownActive(uint256 tileId, uint256 remainingSeconds);

    uint256 internal constant DEFAULT_BAND_STEP = 10;
    uint256 internal constant DEFAULT_FIRST_COOLDOWN = 1 hours;

    /// @notice Mint soft tiles. Any EOA/contract may call. Invalid / unregistered ids revert.
    /// @dev Enforces progressive cooldown per (msg.sender, tileId) before crediting.
    /// @param ids Soft tile ids in [8,47]
    /// @param amounts Parallel amounts (>0)
    function mintTiles(uint256[] calldata ids, uint256[] calldata amounts) external {
        require(ids.length == amounts.length, "TileMint: len");
        require(ids.length > 0, "TileMint: empty");

        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "TileMint: !init");

        // Validate + cooldown + pull payment before mutating balances.
        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            require(amount > 0, "TileMint: amount");
            require(LibAppStorage.isSoftTileId(id), "TileMint: id");
            require(s.tileRegistered[id], "TileMint: !registered");

            _enforceCooldown(s, msg.sender, id);

            LibAppStorage.AlchemicaCost memory cost = _effectiveCost(s, id);
            if (s.paymentEnabled) {
                LibGvPayment.pullAlchemica(s, msg.sender, cost, amount);
                LibGvPayment.payLineBMint(
                    s,
                    msg.sender,
                    LibGvPayment.poolForSoftTile(),
                    amount,
                    LibGvPayment.refFor(msg.sender, id, amount)
                );
            }
        }

        // Credit ERC1155 balances + emit TransferBatch/Single via LibERC1155.
        if (ids.length == 1) {
            LibERC1155.mint(msg.sender, ids[0], amounts[0]);
        } else {
            // calldata → memory copy for library
            uint256[] memory idsMem = new uint256[](ids.length);
            uint256[] memory amtsMem = new uint256[](amounts.length);
            for (uint256 i; i < ids.length; i++) {
                idsMem[i] = ids[i];
                amtsMem[i] = amounts[i];
            }
            LibERC1155.mintBatch(msg.sender, idsMem, amtsMem);
        }

        // Record lifetime counts + last mint timestamps after successful credit.
        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            s.tileMintedCount[msg.sender][id] += amounts[i];
            s.tileLastMintAt[msg.sender][id] = block.timestamp;
        }

        emit TilesMinted(msg.sender, ids, amounts);
    }

    function quoteMintCost(uint256 id, uint256 amount)
        external
        view
        returns (LibAppStorage.AlchemicaCost memory total)
    {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(LibAppStorage.isSoftTileId(id), "TileMint: id");
        require(s.tileRegistered[id], "TileMint: !registered");
        LibAppStorage.AlchemicaCost memory unit = _effectiveCost(s, id);
        total.fud = unit.fud * amount;
        total.fomo = unit.fomo * amount;
        total.alpha = unit.alpha * amount;
        total.kek = unit.kek * amount;
    }

    /// @notice USDC LineBMint fee for `amount` soft tiles (0 if lineB fee off / unset).
    function quoteMintLineBFeeUsdc(uint256 amount) external view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        if (!s.paymentEnabled || !s.lineBFeeEnabled || s.safeFeeRouter == address(0)) return 0;
        return s.lineBMintFeeUsdc * amount;
    }

    /// @notice Seconds until `wallet` may mint `tileId` again (0 = ready).
    function cooldownRemaining(address wallet, uint256 tileId) external view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(LibAppStorage.isSoftTileId(tileId), "TileMint: id");
        return _cooldownRemaining(s, wallet, tileId);
    }

    /// @notice Cooldown duration that will apply to the *next* mint of `tileId` by `wallet`.
    /// @dev Based on current lifetime mintedCount (band before this mint). Band 0 → 0.
    function nextCooldown(address wallet, uint256 tileId) external view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(LibAppStorage.isSoftTileId(tileId), "TileMint: id");
        uint256 count = s.tileMintedCount[wallet][tileId];
        return _cooldownForLifetime(s, count);
    }

    /// @notice Lifetime successful soft-tile mints of `tileId` by `wallet` (not ERC1155 balance).
    function mintedCount(address wallet, uint256 tileId) external view returns (uint256) {
        require(LibAppStorage.isSoftTileId(tileId), "TileMint: id");
        return LibAppStorage.appStorage().tileMintedCount[wallet][tileId];
    }

    /// @notice Timestamp of last successful mint of `tileId` by `wallet` (0 if never).
    function lastMintAt(address wallet, uint256 tileId) external view returns (uint256) {
        require(LibAppStorage.isSoftTileId(tileId), "TileMint: id");
        return LibAppStorage.appStorage().tileLastMintAt[wallet][tileId];
    }

    // -------------------------------------------------------------------------
    // Cooldown math — bands: sizes step, 2*step, 3*step, ...; CD: 0, first, 2*first, ...
    // -------------------------------------------------------------------------

    function _enforceCooldown(LibAppStorage.AppStorage storage s, address wallet, uint256 tileId)
        internal
        view
    {
        uint256 remaining = _cooldownRemaining(s, wallet, tileId);
        if (remaining > 0) revert CooldownActive(tileId, remaining);
    }

    function _cooldownRemaining(LibAppStorage.AppStorage storage s, address wallet, uint256 tileId)
        internal
        view
        returns (uint256)
    {
        uint256 count = s.tileMintedCount[wallet][tileId];
        uint256 required = _cooldownForLifetime(s, count);
        if (required == 0) return 0;
        uint256 last = s.tileLastMintAt[wallet][tileId];
        if (last == 0) return 0;
        uint256 elapsed = block.timestamp - last;
        if (elapsed >= required) return 0;
        return required - elapsed;
    }

    /// @dev Cooldown required when current lifetime minted count is `lifetimeMinted`.
    function _cooldownForLifetime(LibAppStorage.AppStorage storage s, uint256 lifetimeMinted)
        internal
        view
        returns (uint256)
    {
        uint256 band = _bandIndex(lifetimeMinted, _bandStep(s));
        return _cooldownForBand(band, _firstCooldown(s), s.tileCooldownMaxSeconds);
    }

    /// @dev Band 0 covers [0, step), band 1 [step, step+2*step), band 2 … sizes step*(i+1).
    function _bandIndex(uint256 lifetimeMinted, uint256 bandStep) internal pure returns (uint256 band) {
        uint256 cumulative;
        while (true) {
            uint256 size = bandStep * (band + 1);
            uint256 next = cumulative + size;
            if (lifetimeMinted < next) return band;
            cumulative = next;
            unchecked {
                ++band;
            }
            // Practical guard (band sizes grow quadratically; far beyond any play).
            if (band > 10_000) return band;
        }
    }

    function _cooldownForBand(uint256 band, uint256 firstCooldown, uint256 maxCap)
        internal
        pure
        returns (uint256 cd)
    {
        if (band == 0) return 0;
        cd = firstCooldown;
        for (uint256 i = 1; i < band; i++) {
            if (cd > type(uint256).max / 2) {
                cd = type(uint256).max;
                break;
            }
            cd *= 2;
        }
        if (maxCap != 0 && cd > maxCap) cd = maxCap;
    }

    function _bandStep(LibAppStorage.AppStorage storage s) internal view returns (uint256) {
        uint256 step = s.tileCooldownBandStep;
        return step == 0 ? DEFAULT_BAND_STEP : step;
    }

    function _firstCooldown(LibAppStorage.AppStorage storage s) internal view returns (uint256) {
        uint256 v = s.tileFirstCooldownSeconds;
        return v == 0 ? DEFAULT_FIRST_COOLDOWN : v;
    }

    function _effectiveCost(LibAppStorage.AppStorage storage s, uint256 id)
        internal
        view
        returns (LibAppStorage.AlchemicaCost memory cost)
    {
        cost = s.tileCost[id];
        if (cost.fud == 0 && cost.fomo == 0 && cost.alpha == 0 && cost.kek == 0) {
            cost = s.ghostDefaultCost;
        }
    }

}
