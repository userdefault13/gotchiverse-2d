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
import {InitERC1155} from "../src/upgradeInitializers/InitERC1155.sol";
import {IDiamondCut} from "../src/interfaces/IDiamondCut.sol";
import {LibAppStorage} from "../src/libraries/LibAppStorage.sol";
import {SeedTilesLib} from "./SeedTilesLib.sol";
import {FacetSelectors} from "./FacetSelectors.sol";

/// @notice Deploy Gotchiverse-2D soft diamond (ERC1155 soft tiles) to Base Sepolia (or anvil).
/// Prefer UpgradeERC1155 for the live Sepolia diamond instead of a fresh redeploy.
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
        bool paymentEnabled = vm.envOr("PAYMENT_ENABLED", false);
        string memory uri = vm.envOr("ERC1155_URI", string(""));

        vm.startBroadcast(pk);

        DiamondCutFacet cutFacet = new DiamondCutFacet();
        Diamond diamond = new Diamond(deployer, address(cutFacet));

        DiamondLoupeFacet loupe = new DiamondLoupeFacet();
        OwnershipFacet own = new OwnershipFacet();
        GvRulesFacet rules = new GvRulesFacet();
        GvTileMintFacet mint = new GvTileMintFacet();
        GvInventoryFacet inventory = new GvInventoryFacet();
        InitERC1155 init = new InitERC1155();

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](5);
        cut[0] = _cut(address(loupe), FacetSelectors.loupe());
        cut[1] = _cut(address(own), FacetSelectors.ownership());
        cut[2] = _cut(address(rules), FacetSelectors.rules());
        cut[3] = _cut(address(mint), FacetSelectors.mint());
        cut[4] = _cut(address(inventory), FacetSelectors.inventoryERC1155All());

        bytes memory initCalldata = abi.encodeWithSelector(InitERC1155.init.selector, uri);
        DiamondCutFacet(address(diamond)).diamondCut(cut, address(init), initCalldata);

        address[4] memory tokens = [fud, fomo, alpha, kek];
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
        console2.log("GvInventoryFacet", address(inventory));
        console2.log("GvTileMintFacet", address(mint));
        console2.log("InitERC1155", address(init));
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
}
