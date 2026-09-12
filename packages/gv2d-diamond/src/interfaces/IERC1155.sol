// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ERC-1155 Multi Token Standard (subset used by GV-2D soft tiles)
/// @dev ERC-165 id: 0xd9b67a26. supportsInterface lives on DiamondLoupeFacet.
interface IERC1155 {
    event TransferSingle(
        address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value
    );
    event TransferBatch(
        address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data)
        external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;

    function balanceOf(address account, uint256 id) external view returns (uint256);

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory);

    function setApprovalForAll(address operator, bool approved) external;

    function isApprovedForAll(address account, address operator) external view returns (bool);
}
