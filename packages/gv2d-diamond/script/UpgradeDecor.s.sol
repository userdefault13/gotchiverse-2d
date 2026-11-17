// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvCatalogFacet} from "../src/facets/GvCatalogFacet.sol";
import {GvCraftFacet} from "../src/facets/GvCraftFacet.sol";
import {GvPlaceFacet} from "../src/facets/GvPlaceFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";
import {SeedDecorLib} from "./SeedDecorLib.sol";

/// @notice Replace Catalog/Craft/Place (expanded soft-install id check) and register type-7 Decor.
/// @dev GV decor ERC1155 ids = L1 itemId + 1000. Not the Base Installation diamond.
/// forge script script/UpgradeDecor.s.sol:UpgradeDecor \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradeDecor is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        vm.startBroadcast(pk);

        GvCatalogFacet catalog = new GvCatalogFacet();
        GvCraftFacet craft = new GvCraftFacet();
        GvPlaceFacet place = new GvPlaceFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](3);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(catalog),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.catalogAll()
        });
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(craft),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.craft()
        });
        cut[2] = IDiamondCut.FacetCut({
            facetAddress: address(place),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.place()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        SeedDecorLib.seed(diamond);

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvCatalogFacet", address(catalog));
        console2.log("GvCraftFacet", address(craft));
        console2.log("GvPlaceFacet", address(place));
        console2.log("Registered decor count", uint256(48));
        console2.log("Decor id offset", SeedDecorLib.DECOR_ID_OFFSET);
    }
}
