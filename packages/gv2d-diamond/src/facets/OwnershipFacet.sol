// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";

/// @notice Ownership is intentionally not renounced in this spike so rules / cuts stay mutable.
contract OwnershipFacet is IERC173 {
    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }

    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        require(_newOwner != address(0), "Ownership: zero");
        LibDiamond.setContractOwner(_newOwner);
    }
}
