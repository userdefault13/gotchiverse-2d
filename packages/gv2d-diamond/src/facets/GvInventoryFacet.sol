// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../libraries/LibAppStorage.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibERC1155} from "../libraries/LibERC1155.sol";
import {IERC1155} from "../interfaces/IERC1155.sol";
import {IERC1155MetadataURI} from "../interfaces/IERC1155MetadataURI.sol";

/// @notice Diamond-hosted ERC1155 for soft tiles 8–47 (same AppStorage.balances slots).
/// @dev Upgrade path from spike inventory: no sibling token; existing balances remain.
contract GvInventoryFacet is IERC1155, IERC1155MetadataURI {
    /// @notice Optional owner rescue / migration helper.
    function adminTransfer(address from, address to, uint256 id, uint256 amount) external {
        LibDiamond.enforceIsContractOwner();
        // Bypass operator check: owner moves balances and emits TransferSingle.
        require(to != address(0), "ERC1155: transfer zero");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 bal = s.balances[from][id];
        require(bal >= amount, "ERC1155: bal");
        unchecked {
            s.balances[from][id] = bal - amount;
            s.balances[to][id] += amount;
        }
        emit TransferSingle(msg.sender, from, to, id, amount);
    }

    /// @notice Owner-set metadata URI template (RFC 3986; may contain "{id}").
    function setURI(string calldata newuri) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.appStorage().uri = newuri;
        emit URI(newuri, 0);
    }

    function uri(uint256) external view override returns (string memory) {
        return LibAppStorage.appStorage().uri;
    }

    function balanceOf(address account, uint256 id) external view override returns (uint256) {
        require(account != address(0), "ERC1155: bal zero");
        return LibAppStorage.appStorage().balances[account][id];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external
        view
        override
        returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "ERC1155: len");
        uint256[] memory bals = new uint256[](accounts.length);
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        for (uint256 i; i < accounts.length; i++) {
            require(accounts[i] != address(0), "ERC1155: bal zero");
            bals[i] = s.balances[accounts[i]][ids[i]];
        }
        return bals;
    }

    function setApprovalForAll(address operator, bool approved) external override {
        LibERC1155.setApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view override returns (bool) {
        return LibERC1155.isApprovedForAll(account, operator);
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data)
        external
        override
    {
        LibERC1155.safeTransferFrom(msg.sender, from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override {
        LibERC1155.safeBatchTransferFrom(msg.sender, from, to, ids, values, data);
    }

    /// @notice Burn soft tiles (owner or approved operator). Enables later staking sinks.
    function burn(address from, uint256 id, uint256 amount) external {
        require(from == msg.sender || LibERC1155.isApprovedForAll(from, msg.sender), "ERC1155: !approved");
        LibERC1155.burn(from, id, amount);
    }

    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external {
        require(from == msg.sender || LibERC1155.isApprovedForAll(from, msg.sender), "ERC1155: !approved");
        LibERC1155.burnBatch(from, ids, amounts);
    }
}
