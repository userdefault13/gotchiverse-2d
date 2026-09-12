// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";

/// @dev Soft-install registration helpers (zero costs / paymentEnabled=false).
library SeedSoftInstallsLib {
    function zeroCost() internal pure returns (LibAppStorage.AlchemicaCost memory c) {
        return LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
    }

    function _reg(
        uint256 id,
        uint8 installationType,
        uint8 level,
        uint8 width,
        uint8 height,
        uint256 nextLevelId
    ) internal pure returns (GvCatalogFacet.SoftInstallRegistration memory) {
        return GvCatalogFacet.SoftInstallRegistration({
            id: id,
            installationType: installationType,
            level: level,
            width: width,
            height: height,
            nextLevelId: nextLevelId,
            cost: zeroCost()
        });
    }

    /// @notice Original Phase B smoke set (already live on Sepolia).
    function smokeRegs() internal pure returns (GvCatalogFacet.SoftInstallRegistration[] memory regs) {
        regs = new GvCatalogFacet.SoftInstallRegistration[](7);
        regs[0] = _reg(171, 4, 1, 5, 5, 172);
        regs[1] = _reg(180, 9, 1, 2, 2, 181);
        regs[2] = _reg(189, 10, 1, 1, 1, 190);
        regs[3] = _reg(198, 10, 1, 2, 2, 0);
        regs[4] = _reg(199, 10, 1, 2, 2, 200);
        regs[5] = _reg(208, 10, 1, 1, 1, 0);
        regs[6] = _reg(209, 10, 1, 1, 1, 0);
    }

    /// @notice Waalls 162–170 (type 3, 1×1). Catalog costs exist but zeros OK while payment off.
    function waallsRegs() internal pure returns (GvCatalogFacet.SoftInstallRegistration[] memory regs) {
        regs = new GvCatalogFacet.SoftInstallRegistration[](9);
        for (uint8 i; i < 9; i++) {
            uint256 id = 162 + i;
            uint256 nextId = i == 8 ? 0 : id + 1;
            regs[i] = _reg(id, 3, i + 1, 1, 1, nextId);
        }
    }

    /// @notice Remaining inventory-doc soft ids not in smoke set (Lodge/Store/Cashier/Console L2–9 + world/furniture).
    function missingInventoryRegs()
        internal
        pure
        returns (GvCatalogFacet.SoftInstallRegistration[] memory regs)
    {
        // 172-179 Lodge, 181-188 Store, 190-197 Cashier, 200-207 Console, 210-215 world/furniture = 8*4 + 6 = 38
        regs = new GvCatalogFacet.SoftInstallRegistration[](38);
        uint256 n;
        // Lodge L2–9
        for (uint8 i = 2; i <= 9; i++) {
            uint256 id = 170 + i; // 172..179
            regs[n++] = _reg(id, 4, i, 5, 5, i == 9 ? 0 : id + 1);
        }
        // Store L2–9
        for (uint8 i = 2; i <= 9; i++) {
            uint256 id = 179 + i; // 181..188
            regs[n++] = _reg(id, 9, i, 2, 2, i == 9 ? 0 : id + 1);
        }
        // Cashier L2–9
        for (uint8 i = 2; i <= 9; i++) {
            uint256 id = 188 + i; // 190..197
            regs[n++] = _reg(id, 10, i, 1, 1, i == 9 ? 0 : id + 1);
        }
        // Console L2–9
        for (uint8 i = 2; i <= 9; i++) {
            uint256 id = 198 + i; // 200..207
            regs[n++] = _reg(id, 10, i, 2, 2, i == 9 ? 0 : id + 1);
        }
        // World / furniture heads from inventory §1
        regs[n++] = _reg(210, 11, 1, 4, 4, 0); // Bazaar
        regs[n++] = _reg(211, 12, 1, 4, 4, 0); // DAO Satellite Office
        regs[n++] = _reg(212, 13, 1, 4, 4, 0); // Potion Shop
        regs[n++] = _reg(213, 10, 1, 2, 2, 0); // Feature Table
        regs[n++] = _reg(214, 10, 1, 3, 1, 0); // Rack H
        regs[n++] = _reg(215, 10, 1, 1, 3, 0); // Rack V
        require(n == 38, "SeedSoftInstalls: count");
    }

    function seed(address diamond) internal {
        GvCatalogFacet(diamond).registerSoftInstalls(smokeRegs());
        GvCatalogFacet(diamond).setInstallBaseURI("https://gv2d.placeholder/soft-install/{id}.json");
    }

    /// @notice Register Waalls + remaining inventory ids (does not touch installBaseURI).
    function seedWaallsAndMissing(address diamond) internal {
        GvCatalogFacet cat = GvCatalogFacet(diamond);
        cat.registerSoftInstalls(waallsRegs());
        cat.registerSoftInstalls(missingInventoryRegs());
    }
}
