// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {GvCraftFacet} from "../src/facets/GvCraftFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";
import {SeedSoftInstallsLib} from "./SeedSoftInstallsLib.sol";

/// @notice Cut in GvCatalogFacet + GvCraftFacet and seed smoke soft-install types.
/// forge script script/UpgradeSoftInstalls.s.sol:UpgradeSoftInstalls \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradeSoftInstalls is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        vm.startBroadcast(pk);

        GvCatalogFacet catalog = new GvCatalogFacet();
        GvCraftFacet craft = new GvCraftFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](2);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(catalog),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.catalogAll()
        });
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(craft),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.craft()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        SeedSoftInstallsLib.seed(diamond);

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvCatalogFacet", address(catalog));
        console2.log("GvCraftFacet", address(craft));
        console2.log("Seeded soft installs: 171,180,189,198,199,208,209");
    }
}
