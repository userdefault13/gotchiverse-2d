// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";

/// @dev Smoke registration set for soft installs (zero costs / paymentEnabled=false).
library SeedSoftInstallsLib {
    function zeroCost() internal pure returns (LibAppStorage.AlchemicaCost memory c) {
        return LibAppStorage.AlchemicaCost({fud: 0, fomo: 0, alpha: 0, kek: 0});
    }

    function smokeRegs() internal pure returns (GvCatalogFacet.SoftInstallRegistration[] memory regs) {
        regs = new GvCatalogFacet.SoftInstallRegistration[](7);
        LibAppStorage.AlchemicaCost memory z = zeroCost();

        // Lodge L1
        regs[0] = GvCatalogFacet.SoftInstallRegistration({
            id: 171, installationType: 4, level: 1, width: 5, height: 5, nextLevelId: 172, cost: z
        });
        // Store L1
        regs[1] = GvCatalogFacet.SoftInstallRegistration({
            id: 180, installationType: 9, level: 1, width: 2, height: 2, nextLevelId: 181, cost: z
        });
        // Cashier L1
        regs[2] = GvCatalogFacet.SoftInstallRegistration({
            id: 189, installationType: 10, level: 1, width: 1, height: 1, nextLevelId: 190, cost: z
        });
        // Display Table
        regs[3] = GvCatalogFacet.SoftInstallRegistration({
            id: 198, installationType: 10, level: 1, width: 2, height: 2, nextLevelId: 0, cost: z
        });
        // Console L1
        regs[4] = GvCatalogFacet.SoftInstallRegistration({
            id: 199, installationType: 10, level: 1, width: 2, height: 2, nextLevelId: 200, cost: z
        });
        // Terminal
        regs[5] = GvCatalogFacet.SoftInstallRegistration({
            id: 208, installationType: 10, level: 1, width: 1, height: 1, nextLevelId: 0, cost: z
        });
        // Broadcaster
        regs[6] = GvCatalogFacet.SoftInstallRegistration({
            id: 209, installationType: 10, level: 1, width: 1, height: 1, nextLevelId: 0, cost: z
        });
    }

    function seed(address diamond) internal {
        GvCatalogFacet(diamond).registerSoftInstalls(smokeRegs());
        GvCatalogFacet(diamond).setInstallBaseURI(
            "https://gv2d.placeholder/soft-install/{id}.json"
        );
    }
}
