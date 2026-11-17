// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";

/// @notice One-shot diamondCut init: register ERC1155 interface ids + optional URI.
contract InitERC1155 {
    event ERC1155Initialized(string uri);

    /// @param uri_ Metadata URI template (may be empty; owner can setURI later).
    function init(string calldata uri_) external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        // ERC1155
        ds.supportedInterfaces[0xd9b67a26] = true;
        // ERC1155MetadataURI
        ds.supportedInterfaces[0x0e89341c] = true;

        if (bytes(uri_).length > 0) {
            LibAppStorage.appStorage().uri = uri_;
        }
        emit ERC1155Initialized(uri_);
    }
}
