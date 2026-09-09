// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev ERC-165 ids: onERC1155Received 0xf23a6e61 / onERC1155BatchReceived 0xbc197c81
interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}
