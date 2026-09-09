// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibAppStorage} from "../libraries/LibAppStorage.sol";

/// @notice Owner-mutable soft-install type catalog (Waall/Lodge/Store/furniture).
/// @dev Metadata URI is a mutable placeholder (`installBaseURI`); on-chain SVG later via diamondCut.
contract GvCatalogFacet {
    event SoftInstallRegistered(
        uint256 indexed id,
        uint8 installationType,
        uint8 level,
        uint8 width,
        uint8 height,
        uint256 nextLevelId,
        uint256 fud,
        uint256 fomo,
        uint256 alpha,
        uint256 kek
    );
    event SoftInstallCostUpdated(uint256 indexed id, uint256 fud, uint256 fomo, uint256 alpha, uint256 kek);
    event InstallBaseURISet(string uri);

    struct SoftInstallRegistration {
        uint256 id;
        uint8 installationType;
        uint8 level;
        uint8 width;
        uint8 height;
        uint256 nextLevelId;
        LibAppStorage.AlchemicaCost cost;
    }

    function registerSoftInstall(SoftInstallRegistration calldata reg) external {
        LibDiamond.enforceIsContractOwner();
        _register(reg);
    }

    function registerSoftInstalls(SoftInstallRegistration[] calldata regs) external {
        LibDiamond.enforceIsContractOwner();
        for (uint256 i; i < regs.length; i++) {
            _register(regs[i]);
        }
    }

    function setSoftInstallCost(uint256 id, LibAppStorage.AlchemicaCost calldata cost) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.softInstalls[id].registered, "GvCatalog: !registered");
        s.softInstalls[id].cost = cost;
        s.rulesVersion += 1;
        emit SoftInstallCostUpdated(id, cost.fud, cost.fomo, cost.alpha, cost.kek);
    }

    function setInstallBaseURI(string calldata uri_) external {
        LibDiamond.enforceIsContractOwner();
        LibAppStorage.appStorage().installBaseURI = uri_;
        emit InstallBaseURISet(uri_);
    }

    function softInstall(uint256 id) external view returns (LibAppStorage.SoftInstallType memory) {
        return LibAppStorage.appStorage().softInstalls[id];
    }

    function isSoftInstallRegistered(uint256 id) external view returns (bool) {
        return LibAppStorage.appStorage().softInstalls[id].registered;
    }

    function softInstallCost(uint256 id) external view returns (LibAppStorage.AlchemicaCost memory) {
        return LibAppStorage.appStorage().softInstalls[id].cost;
    }

    function installBaseURI() external view returns (string memory) {
        return LibAppStorage.appStorage().installBaseURI;
    }

    function softInstallIdRange() external pure returns (uint256 start, uint256 end) {
        return (LibAppStorage.SOFT_INSTALL_ID_START, LibAppStorage.SOFT_INSTALL_ID_END);
    }

    function _register(SoftInstallRegistration calldata reg) internal {
        require(LibAppStorage.isSoftInstallId(reg.id), "GvCatalog: id range");
        require(reg.width > 0 && reg.height > 0, "GvCatalog: size");
        require(reg.level > 0, "GvCatalog: level");
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.softInstalls[reg.id] = LibAppStorage.SoftInstallType({
            registered: true,
            installationType: reg.installationType,
            level: reg.level,
            width: reg.width,
            height: reg.height,
            nextLevelId: reg.nextLevelId,
            cost: reg.cost
        });
        emit SoftInstallRegistered(
            reg.id,
            reg.installationType,
            reg.level,
            reg.width,
            reg.height,
            reg.nextLevelId,
            reg.cost.fud,
            reg.cost.fomo,
            reg.cost.alpha,
            reg.cost.kek
        );
    }
}
