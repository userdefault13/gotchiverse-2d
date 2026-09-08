// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Diamond} from "../src/Diamond.sol";
import {DiamondCutFacet} from "../src/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "../src/facets/DiamondLoupeFacet.sol";
import {OwnershipFacet} from "../src/facets/OwnershipFacet.sol";
import {GvRulesFacet} from "../src/facets/GvRulesFacet.sol";
import {GvTileMintFacet} from "../src/facets/GvTileMintFacet.sol";
import {GvInventoryFacet} from "../src/facets/GvInventoryFacet.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {SeedTilesLib} from "./SeedTilesLib.sol";

/// @notice Deploy Gotchiverse-2D soft diamond to Base Sepolia (or anvil).
/// forge script script/DeployGv2dDiamond.s.sol:DeployGv2dDiamond \
///   --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract DeployGv2dDiamond is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.envOr("DEPLOYER_ADDRESS", vm.addr(pk));

        address fud = vm.envOr("FUD_TOKEN", address(0));
        address fomo = vm.envOr("FOMO_TOKEN", address(0));
        address alpha = vm.envOr("ALPHA_TOKEN", address(0));
        address kek = vm.envOr("KEK_TOKEN", address(0));
        // Default spike: free-mint smoke mode unless PAYMENT_ENABLED=true and tokens set.
        bool paymentEnabled = vm.envOr("PAYMENT_ENABLED", false);

        vm.startBroadcast(pk);

        DiamondCutFacet cutFacet = new DiamondCutFacet();
        Diamond diamond = new Diamond(deployer, address(cutFacet));

        DiamondLoupeFacet loupe = new DiamondLoupeFacet();
        OwnershipFacet own = new OwnershipFacet();
        GvRulesFacet rules = new GvRulesFacet();
        GvTileMintFacet mint = new GvTileMintFacet();
        GvInventoryFacet inventory = new GvInventoryFacet();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](5);
        cut[0] = _cut(address(loupe), _loupeSelectors());
        cut[1] = _cut(address(own), _ownSelectors());
        cut[2] = _cut(address(rules), _rulesSelectors());
        cut[3] = _cut(address(mint), _mintSelectors());
        cut[4] = _cut(address(inventory), _inventorySelectors());
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(0), "");

        address[4] memory tokens = [fud, fomo, alpha, kek];
        // Ghost zero-cost default: 5 FUD + 2 ALPHA (18 decimals), matching ctile.helper softCost.
        LibAppStorage.AlchemicaCost memory ghostDefault = LibAppStorage.AlchemicaCost({
            fud: 5 ether,
            fomo: 0,
            alpha: 2 ether,
            kek: 0
        });
        GvRulesFacet(address(diamond)).initGvRules(tokens, ghostDefault, paymentEnabled);

        (uint256[] memory ids, LibAppStorage.AlchemicaCost[] memory costs) = SeedTilesLib.tileCatalog();
        GvRulesFacet(address(diamond)).registerTiles(ids, costs);

        address diamondAddr = address(diamond);
        vm.stopBroadcast();

        console2.log("Gv2dDiamond", diamondAddr);
        console2.log("paymentEnabled", paymentEnabled);
        console2.log("owner", deployer);
    }

    function _cut(address facet, bytes4[] memory selectors)
        internal
        pure
        returns (IDiamondCut.FacetCut memory)
    {
        return IDiamondCut.FacetCut({
            facetAddress: facet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }

    function _loupeSelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](5);
        s[0] = DiamondLoupeFacet.facets.selector;
        s[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        s[2] = DiamondLoupeFacet.facetAddresses.selector;
        s[3] = DiamondLoupeFacet.facetAddress.selector;
        s[4] = DiamondLoupeFacet.supportsInterface.selector;
    }

    function _ownSelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = OwnershipFacet.owner.selector;
        s[1] = OwnershipFacet.transferOwnership.selector;
    }

    function _rulesSelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](14);
        s[0] = GvRulesFacet.initGvRules.selector;
        s[1] = GvRulesFacet.setPaymentEnabled.selector;
        s[2] = GvRulesFacet.setAlchemicaTokens.selector;
        s[3] = GvRulesFacet.setGhostDefaultCost.selector;
        s[4] = GvRulesFacet.registerTile.selector;
        s[5] = GvRulesFacet.registerTiles.selector;
        s[6] = GvRulesFacet.setTileCost.selector;
        s[7] = GvRulesFacet.paymentEnabled.selector;
        s[8] = GvRulesFacet.alchemicaTokens.selector;
        s[9] = GvRulesFacet.ghostDefaultCost.selector;
        s[10] = GvRulesFacet.tileCost.selector;
        s[11] = GvRulesFacet.isTileRegistered.selector;
        s[12] = GvRulesFacet.rulesVersion.selector;
        s[13] = GvRulesFacet.softTileIdRange.selector;
    }

    function _mintSelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](2);
        s[0] = GvTileMintFacet.mintTiles.selector;
        s[1] = GvTileMintFacet.quoteMintCost.selector;
    }

    function _inventorySelectors() internal pure returns (bytes4[] memory s) {
        s = new bytes4[](3);
        s[0] = GvInventoryFacet.balanceOf.selector;
        s[1] = GvInventoryFacet.balanceOfBatch.selector;
        s[2] = GvInventoryFacet.adminTransfer.selector;
    }
}
