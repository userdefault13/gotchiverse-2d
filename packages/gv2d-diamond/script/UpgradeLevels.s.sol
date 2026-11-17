// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvUpgradeFacet} from "../src/facets/GvUpgradeFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";

/// @notice Cut in GvUpgradeFacet for soft-install level bumps (bag + placement).
/// forge script script/UpgradeLevels.s.sol:UpgradeLevels \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradeLevels is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        vm.startBroadcast(pk);

        GvUpgradeFacet upgrade = new GvUpgradeFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(upgrade),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.upgrade()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvUpgradeFacet", address(upgrade));
    }
}
