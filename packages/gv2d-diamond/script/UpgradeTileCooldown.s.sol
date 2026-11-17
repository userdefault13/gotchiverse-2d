// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {FacetSelectors} from "./FacetSelectors.sol";

/// @notice Cut progressive soft-tile craft cooldowns into live GV-2D diamond.
/// @dev Replace TileMint + Rules impls; Add cooldown view/setter selectors; seed defaults.
/// forge script script/UpgradeTileCooldown.s.sol:UpgradeTileCooldown \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract UpgradeTileCooldown is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address diamond = vm.envAddress("GV2D_DIAMOND");

        // Defaults: bandStep=10, firstCooldown=1h, maxCap=0 (uncapped).
        uint256 bandStep = vm.envOr("TILE_COOLDOWN_BAND_STEP", uint256(10));
        uint256 firstCd = vm.envOr("TILE_FIRST_COOLDOWN_SECONDS", uint256(3600));
        uint256 maxCap = vm.envOr("TILE_COOLDOWN_MAX_SECONDS", uint256(0));

        vm.startBroadcast(pk);

        GvTileMintFacet mint = new GvTileMintFacet();
        GvRulesFacet rules = new GvRulesFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](4);

        // Replace existing mintSelectors onto new impl (enforces cooldown).
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(mint),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.mint()
        });

        // Add cooldown view helpers.
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(mint),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.mintCooldownNew()
        });

        // Replace existing Rules selectors onto new impl.
        cut[2] = IDiamondCut.FacetCut({
            facetAddress: address(rules),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: FacetSelectors.rulesExisting()
        });

        // Add cooldown tunables.
        cut[3] = IDiamondCut.FacetCut({
            facetAddress: address(rules),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: FacetSelectors.rulesCooldownNew()
        });

        DiamondCutFacet(diamond).diamondCut(cut, address(0), "");

        GvRulesFacet(diamond).setTileCooldownParams(bandStep, firstCd, maxCap);

        vm.stopBroadcast();

        console2.log("Upgraded diamond", diamond);
        console2.log("GvTileMintFacet", address(mint));
        console2.log("GvRulesFacet", address(rules));
        console2.log("bandStep", bandStep);
        console2.log("firstCooldownSeconds", firstCd);
        console2.log("maxCapSeconds", maxCap);
    }
}
