// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {IERC20} from "../interfaces/IERC20.sol";

/// @notice Permissionless soft-tile mint for ids [8,47]. No minter role.
/// @dev Replaces FE `craftCTileLocally`. Golden LE tiles 1–3 stay on the live Tile diamond.
contract GvTileMintFacet {
    event TilesMinted(address indexed to, uint256[] ids, uint256[] amounts);

    /// @notice Mint soft tiles. Any EOA/contract may call. Invalid / unregistered ids revert.
    /// @param ids Soft tile ids in [8,47]
    /// @param amounts Parallel amounts (>0)
    function mintTiles(uint256[] calldata ids, uint256[] calldata amounts) external {
        require(ids.length == amounts.length, "TileMint: len");
        require(ids.length > 0, "TileMint: empty");

        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.initialized, "TileMint: !init");

        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            require(amount > 0, "TileMint: amount");
            require(LibAppStorage.isSoftTileId(id), "TileMint: id");
            require(s.tileRegistered[id], "TileMint: !registered");

            LibAppStorage.AlchemicaCost memory cost = _effectiveCost(s, id);
            if (s.paymentEnabled) {
                _pullCost(s, msg.sender, cost, amount);
            }

            s.balances[msg.sender][id] += amount;
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
        require(token != address(0), "TileMint: token");
        bool ok = IERC20(token).transferFrom(from, address(this), amount);
        require(ok, "TileMint: transfer");
    }
}
