// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev ERC-165 id: 0x0e89341c
interface IERC1155MetadataURI {
    function uri(uint256 id) external view returns (string memory);
}
