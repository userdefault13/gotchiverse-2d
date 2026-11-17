// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {SeedTilesLib} from "./SeedTilesLib.sol";

/// @notice Re-register tiles 8–47 on an existing diamond (owner only).
/// GV2D_DIAMOND=0x... forge script script/SeedTiles.s.sol:SeedTiles --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract SeedTiles is Script {
    function run() external {
        address diamond = vm.envAddress("GV2D_DIAMOND");
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs) = SeedTilesLib.tileCatalog();
        GvRulesFacet(diamond).registerTiles(ids, costs);
        vm.stopBroadcast();
        console2.log("Seeded tiles 8-47 on", diamond);
        console2.log("count", ids.length);
    }
}
