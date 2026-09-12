// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvPlaceFacet} from "../src/facets/GvPlaceFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";
import {SeedSoftInstallsLib} from "./SeedSoftInstallsLib.sol";

/// @notice Cut in GvPlaceFacet and register Waalls + remaining soft-install inventory ids.
/// forge script script/UpgradePlace.s.sol:UpgradePlace \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradePlace is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        vm.startBroadcast(pk);

        GvPlaceFacet place = new GvPlaceFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(place),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.place()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        SeedSoftInstallsLib.seedWaallsAndMissing(diamond);

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvPlaceFacet", address(place));
        console2.log("Registered Waalls 162-170 + missing inventory soft ids");
    }
}
