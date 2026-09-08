// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

/// @notice Diamond-native soft-tile balances (not a sibling ERC1155).
/// @dev Chosen for this spike to avoid a separate token deploy; upgrade path can cut in
///      a full ERC1155 facet later without changing AppStorage balance slots.
contract GvInventoryFacet {
    event TransferSingle(
        address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value
    );

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return LibAppStorage.appStorage().balances[account][id];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "Inventory: len");
        uint256[] memory bals = new uint256[](accounts.length);
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < accounts.length; i++) {
            bals[i] = s.balances[accounts[i]][ids[i]];
        }
        return bals;
    }

    /// @notice Optional owner rescue / migration helper — not a public transfer market.
    function adminTransfer(address from, address to, uint256 id, uint256 amount) external {
        LibDiamond.enforceIsContractOwner();
        require(to != address(0), "Inventory: zero");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 bal = s.balances[from][id];
        require(bal >= amount, "Inventory: bal");
        unchecked {
            s.balances[from][id] = bal - amount;
            s.balances[to][id] += amount;
        }
        emit TransferSingle(msg.sender, from, to, id, amount);
    }
}
